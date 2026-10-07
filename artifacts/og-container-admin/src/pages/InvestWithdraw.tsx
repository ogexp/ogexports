import { useState, useEffect, useMemo, useCallback } from "react"
import { Link } from "wouter"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { OtpInput } from "@/components/auth/OtpInput"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog"
import {
  Wallet, Shield, CheckCircle2, Clock, ChevronRight, ArrowRight,
  AlertCircle, Building2, Info, Lock, Loader2
} from "lucide-react"
import { useLocalAuth } from "@/lib/local-auth"
import { useCurrency } from "@/lib/use-currency"
import {
  formatInvestorLedgerAmount,
  savedUsdEquivalentForRecordedAmount,
} from "@/lib/format-investor-ledger"
import { formatMoneyCode } from "@/lib/format-pkr-first"
import { api, unwrapPage, ApiError } from "@/lib/api"
import { paymentStatusLabel } from "@/lib/deposit-statuses"
import { useInvestorDashboardBalance } from "@/lib/investor-balance"
import { TransactionHistoryCard, type TransactionHistoryItem } from "@/components/invest/TransactionHistoryCard"
import { notify } from "@/lib/notify"
import {
  type InvestorBankAccount,
  defaultBankAccount,
  hasUsableBankAccount,
  normalizeBankAccount,
} from "@/lib/investor-bank-accounts"
import {
  maximumWithdrawalPayout,
  withdrawalFeeTermsConfirmed,
} from "@/lib/investor-withdrawal-terms"

type Step = "overview" | "form" | "security" | "tracking"

type WithdrawBank = {
  bank_name?: string
  account_holder?: string
  account_number?: string
  iban?: string
  swift?: string
  branch?: string
  currency?: string
}

function formatSourceAmount(amount: number | null, currency: string): string {
  if (amount == null || !Number.isFinite(amount) || !currency) return "Not provided"
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function readResponseAmount(value: unknown): number | null {
  if (value == null || String(value).trim() === "") return null
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : null
}

export default function InvestWithdraw() {
  const { user } = useLocalAuth()
  const c = useCurrency()
  const queryClient = useQueryClient()
  const dashboardBalanceQuery = useInvestorDashboardBalance()
  const [step, setStep] = useState<Step>("overview")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState("")
  const [bankName, setBankName] = useState("")
  const [accountHolder, setAccountHolder] = useState("")
  const [accountNumber, setAccountNumber] = useState("")
  const [iban, setIban] = useState("")
  const [swift, setSwift] = useState("")
  const [branch, setBranch] = useState("")
  const [purpose, setPurpose] = useState("")
  const [otp, setOtp] = useState("")
  const [txPassword, setTxPassword] = useState("")
  const [withdrawId, setWithdrawId] = useState("")
  const [withdrawStatus, setWithdrawStatus] = useState("")
  const [withdrawalConfirmation, setWithdrawalConfirmation] = useState<Record<string, unknown> | null>(null)
  const availableBalance = dashboardBalanceQuery.data?.availableBalance ?? null
  const [pendingBalance, setPendingBalance] = useState<number | null>(null)
  const [walletCurrencyFromWallet, setWalletCurrencyFromWallet] = useState("")
  const ledgerCurrency = dashboardBalanceQuery.data?.currency || walletCurrencyFromWallet
  const withdrawalFee = dashboardBalanceQuery.data?.withdrawalFee ?? null
  const withdrawalFeeUsd = dashboardBalanceQuery.data?.withdrawalFeeUsd ?? null
  const withdrawalFeeCurrency = dashboardBalanceQuery.data?.withdrawalFeeCurrency ?? ""
  const withdrawalProcessingTime = dashboardBalanceQuery.data?.withdrawalProcessingTime ?? ""
  const withdrawalTermsConfirmed = withdrawalFeeTermsConfirmed(
    {
      fee: withdrawalFee,
      feeUsd: withdrawalFeeUsd,
      feeCurrency: withdrawalFeeCurrency,
      processingTime: withdrawalProcessingTime,
    },
    dashboardBalanceQuery.data?.serverWalletCurrency ?? "",
  )
  const fmtW = (amount: number | null, usdAmount?: number | null) =>
    amount == null || !ledgerCurrency
      ? "Not provided"
      : formatInvestorLedgerAmount(c, amount, {
        usdAmount,
        ledgerCurrency,
        lockedRate: c.isPK && c.rate > 0 ? c.rate : null,
      })
  const [walletLoading, setWalletLoading] = useState(true)
  const balanceLoading = walletLoading || dashboardBalanceQuery.isFetching
  const balanceUnavailable = dashboardBalanceQuery.isError || dashboardBalanceQuery.isFetching || availableBalance == null
  const [submitting, setSubmitting] = useState(false)
  const [otpSending, setOtpSending] = useState(false)
  const [otpEmail, setOtpEmail] = useState("")
  const [otpCooldown, setOtpCooldown] = useState(0)
  const [formError, setFormError] = useState("")
  const [savedWithdrawBank, setSavedWithdrawBank] = useState<WithdrawBank | null>(null)
  const [hasSavedBanks, setHasSavedBanks] = useState(false)
  const [autoFillBank, setAutoFillBank] = useState(false)
  const [saveBankDetails, setSaveBankDetails] = useState(true)
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetForm, setResetForm] = useState({ login: "", tx: "", confirm: "" })
  const [resetSaving, setResetSaving] = useState(false)

  const maxWithdrawal = maximumWithdrawalPayout(
    availableBalance,
    withdrawalTermsConfirmed ? withdrawalFee : null,
  )
  const amountNum = parseFloat(amount) || 0
  const exceedsBalance =
    dashboardBalanceQuery.isError
    || availableBalance == null
    || (maxWithdrawal != null
      && Math.round(amountNum * 100) > Math.round(maxWithdrawal * 100))

  const applyWithdrawBank = useCallback((bank: WithdrawBank) => {
    setBankName(bank.bank_name || "")
    setAccountHolder(bank.account_holder || "")
    setAccountNumber(bank.account_number || "")
    setIban(bank.iban || "")
    setSwift(bank.swift || "")
    setBranch(bank.branch || "")
    // Currency stays locked to wallet ledger — never override from bank account.
  }, [])

  async function loadWallet() {
    setWalletLoading(true)
    try {
      const walletRes: any = await api.get("/api/investor/wallet")
      const wallet = walletRes?.data ?? walletRes
      const parsedPending = wallet?.pending_balance == null || String(wallet.pending_balance).trim() === ""
        ? null
        : Number(wallet.pending_balance)
      setPendingBalance(parsedPending != null && Number.isFinite(parsedPending) ? parsedPending : null)
      const cur = String(wallet?.currency || "").trim().toUpperCase()
      setWalletCurrencyFromWallet(cur)
    } catch {
      setPendingBalance(null)
      setWalletCurrencyFromWallet("")
    } finally {
      setWalletLoading(false)
    }
  }

  async function loadProfileBank(): Promise<WithdrawBank | null> {
    try {
      const res: any = await api.get("/api/investor/profile")
      const d = res?.data ?? res
      const rawAccounts = Array.isArray(d?.bank_accounts) ? d.bank_accounts : []
      const accounts: InvestorBankAccount[] = rawAccounts
        .map((a: any) => normalizeBankAccount(a || {}, currency))
        .filter(hasUsableBankAccount)
      const def = (d?.default_bank_account
        ? normalizeBankAccount(d.default_bank_account, currency)
        : null) || defaultBankAccount(accounts)

      // Legacy fallback if API has not been rebuilt yet
      const wb = d?.withdraw_bank as WithdrawBank | undefined
      const legacyUsable = wb && (wb.bank_name || wb.account_number)

      if (def && hasUsableBankAccount(def)) {
        setSavedWithdrawBank(def)
        setHasSavedBanks(true)
        setAutoFillBank(true)
        return def
      }
      if (legacyUsable && wb) {
        setSavedWithdrawBank(wb)
        setHasSavedBanks(true)
        setAutoFillBank(true)
        return wb
      }
      setSavedWithdrawBank(null)
      setHasSavedBanks(false)
      setAutoFillBank(false)
      return null
    } catch {
      setSavedWithdrawBank(null)
      setHasSavedBanks(false)
      setAutoFillBank(false)
      return null
    }
  }

  async function proceedToWithdrawForm() {
    let bank = savedWithdrawBank
    if (!bank) {
      bank = await loadProfileBank()
    }
    if (bank) {
      setAutoFillBank(true)
      applyWithdrawBank(bank)
    }
    setStep("form")
  }

  const { data: historyPayload, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ["investor", "withdrawals"],
    queryFn: () => api.get("/api/investor/withdrawals", { per_page: 20 }),
  })
  const withdrawalHistory = unwrapPage<any>(historyPayload).data

  function formatWithdrawAmount(
    amt: number | null,
    lockedRate?: number | null,
    amountUsd?: number | null,
    amountCurrency?: string | null,
  ) {
    if (amt == null || !Number.isFinite(amt)) return "Not recorded"
    const currencyCode = String(amountCurrency || "").trim().toUpperCase()
    if (!currencyCode) {
      return `${amt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (currency not recorded)`
    }

    const recordedAmount = formatMoneyCode(amt, currencyCode)
    if (currencyCode === "USD") return recordedAmount

    const usdEquivalent = savedUsdEquivalentForRecordedAmount(
      amt,
      currencyCode,
      amountUsd ?? null,
      lockedRate ?? null,
    )
    return usdEquivalent == null
      ? recordedAmount
      : `${recordedAmount} (${formatMoneyCode(usdEquivalent, "USD")})`
  }

  const withdrawalHistoryItems: TransactionHistoryItem[] = useMemo(
    () => (withdrawalHistory || []).map((w: any) => {
      const bankDetails = w.bank_details || {}
      const bank = bankDetails.bank_name || bankDetails.bank || w.bank_name || w.bank || "Bank Transfer"
      const ref = w.withdraw_id || w.reference || `OGWITH-INV-${String(w.id).padStart(3, "0")}`
      const lockedRate = w.exchange_rate != null ? Number(w.exchange_rate) : null
      const amountUsd = readResponseAmount(w.amount_usd)
      const fee = readResponseAmount(w.fee ?? w.withdrawal_fee)
      const feeUsd = readResponseAmount(w.fee_usd ?? w.withdrawal_fee_usd)
      const totalDebit = readResponseAmount(w.total_debit)
      const totalDebitUsd = readResponseAmount(w.total_debit_usd)
      const amountCurrency = w.currency || bankDetails.currency || w.amount_currency || w.wallet_currency || ""
      return {
        id: String(w.id),
        primary: `${bank} · ${formatWithdrawAmount(readResponseAmount(w.amount), lockedRate, amountUsd, amountCurrency)}`,
        breakdown: {
          payout: formatWithdrawAmount(readResponseAmount(w.amount), lockedRate, amountUsd, amountCurrency),
          fee: formatWithdrawAmount(fee, lockedRate, feeUsd, amountCurrency),
          totalDebit: formatWithdrawAmount(totalDebit, lockedRate, totalDebitUsd, amountCurrency),
        },
        reference: ref,
        date: w.created_at
          ? new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : undefined,
        status: w.status || "unknown",
        statusLabel: paymentStatusLabel(w.status),
        pdfPath: `/api/investor/withdrawals/${w.id}/pdf`,
      }
    }),
    [withdrawalHistory, ledgerCurrency, c],
  )

  useEffect(() => {
    void loadWallet()
    void loadProfileBank()
  }, [])

  useEffect(() => {
    const currentCurrency = dashboardBalanceQuery.data?.currency || walletCurrencyFromWallet
    if (currentCurrency) setCurrency(currentCurrency)
  }, [dashboardBalanceQuery.data?.currency, walletCurrencyFromWallet])

  useEffect(() => {
    if (otpCooldown <= 0) return
    const t = setTimeout(() => setOtpCooldown(v => v - 1), 1000)
    return () => clearTimeout(t)
  }, [otpCooldown])

  useEffect(() => {
    if (step !== "form" || !autoFillBank || !savedWithdrawBank) return
    applyWithdrawBank(savedWithdrawBank)
  }, [step, autoFillBank, savedWithdrawBank, applyWithdrawBank])

  async function sendWithdrawOtp() {
    setOtpSending(true)
    setFormError("")
    try {
      const res: any = await api.post("/api/investor/withdrawals/otp/send")
      setOtpEmail(res?.data?.email || "")
      setOtpCooldown(60)
      notify.success("Verification code sent to your email")
      setStep("security")
    } catch (e: any) {
      const msg = e instanceof ApiError ? e.message : e?.message || "Failed to send OTP."
      setFormError(msg)
      notify.error(msg)
    } finally {
      setOtpSending(false)
    }
  }

  async function handleContinueToSecurity() {
    setFormError("")
    if (!withdrawalTermsConfirmed || maxWithdrawal == null) {
      setFormError("Withdrawal fee information could not be confirmed by OG Exports. Retry before continuing.")
      return
    }
    if (dashboardBalanceQuery.isError || dashboardBalanceQuery.isFetching) {
      setFormError(dashboardBalanceQuery.isError
        ? "Available balance could not be loaded. Retry before continuing."
        : "Please wait while the available balance is refreshed.")
      return
    }
    if (!amount || amountNum <= 0 || exceedsBalance || !currency || !bankName || !accountHolder || !accountNumber) {
      setFormError("Please complete all required fields.")
      return
    }
    await sendWithdrawOtp()
  }

  async function handleResendOtp() {
    if (otpCooldown > 0) return
    await sendWithdrawOtp()
  }

  async function handleVerifyAndContinue() {
    setFormError("")
    if (otp.length !== 6) {
      setFormError("Enter the 6-digit verification code.")
      return
    }
    if (!txPassword) {
      setFormError("Enter your transaction password.")
      return
    }
    if (dashboardBalanceQuery.isError || dashboardBalanceQuery.isFetching) {
      setFormError(dashboardBalanceQuery.isError
        ? "Available balance could not be loaded. Retry before continuing."
        : "Please wait while the available balance is refreshed.")
      return
    }
    if (
      !withdrawalTermsConfirmed
      || maxWithdrawal == null
      || amountNum <= 0
      || Math.round(amountNum * 100) > Math.round(maxWithdrawal * 100)
      || !currency
    ) {
      setFormError("Invalid withdrawal amount.")
      return
    }

    setSubmitting(true)
    try {
      const res: any = await api.post("/api/investor/withdrawals", {
        amount: amountNum,
        otp,
        transaction_password: txPassword,
        save_bank_details: saveBankDetails,
        bank_details: {
          bank_name: bankName,
          account_holder: accountHolder,
          account_number: accountNumber,
          iban,
          swift,
          branch,
          purpose,
          currency,
        },
        note: purpose || undefined,
      })
      const data = res?.data ?? res
      setWithdrawalConfirmation(data && typeof data === "object" ? data as Record<string, unknown> : null)
      const ref = data?.withdraw_id || data?.reference || ""
      setWithdrawId(ref)
      setWithdrawStatus(String(data?.status || data?.state || "submitted"))
      setOtp("")
      setTxPassword("")
      setStep("tracking")
      notify.success("Withdrawal submitted successfully")
      void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
      void loadWallet()
      void loadProfileBank()
      void refetchHistory()
    } catch (e: any) {
      const msg =
        e instanceof ApiError
          ? (e.errors?.otp?.[0] || e.errors?.transaction_password?.[0] || e.errors?.amount?.[0] || e.message)
          : e?.message || "Withdrawal request failed."
      setFormError(String(msg))
      notify.error(String(msg))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleResetTxPassword() {
    if (resetForm.tx !== resetForm.confirm) {
      notify.error("Transaction passwords do not match")
      return
    }
    setResetSaving(true)
    try {
      await api.post("/api/investor/security/transaction-password/reset", {
        password: resetForm.login,
        transaction_password: resetForm.tx,
        transaction_password_confirmation: resetForm.confirm,
      })
      notify.success("Transaction password updated")
      setShowResetModal(false)
      setResetForm({ login: "", tx: "", confirm: "" })
    } catch (e: any) {
      notify.error(e?.errors?.password?.[0] || e?.message || "Unable to reset password")
    } finally {
      setResetSaving(false)
    }
  }

  return (
    <InvestPortalLayout title="Withdraw Funds" subtitle="Transfer your earnings to your bank account">
      <div className="max-w-3xl mx-auto space-y-6">

        {step === "overview" && (
          <div className="space-y-6">
            {walletLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading wallet…
              </div>
            )}
            {dashboardBalanceQuery.isError && (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-600">
                <span>Available balance could not be loaded from the investor dashboard.</span>
                <Button variant="outline" size="sm" onClick={() => void dashboardBalanceQuery.refetch()}>
                  Retry
                </Button>
              </div>
            )}
            {!balanceLoading && !dashboardBalanceQuery.isError && !withdrawalTermsConfirmed && (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                <span>Withdrawal fee information could not be confirmed. Retry before continuing.</span>
                <Button variant="outline" size="sm" onClick={() => void dashboardBalanceQuery.refetch()}>
                  Retry
                </Button>
              </div>
            )}
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Available Balance", value: dashboardBalanceQuery.isError ? "Unavailable" : balanceLoading ? "…" : fmtW(availableBalance), color: "text-foreground", icon: Wallet },
                { label: "Maximum Payout After Fee", value: dashboardBalanceQuery.isError ? "Unavailable" : balanceLoading ? "…" : maxWithdrawal == null ? "Unavailable" : fmtW(maxWithdrawal), color: "text-emerald-500", icon: CheckCircle2 },
                { label: "Minimum / Maximum Withdrawal", value: `Not published / ${dashboardBalanceQuery.isError ? "Unavailable" : balanceLoading ? "…" : maxWithdrawal == null ? "Unavailable" : fmtW(maxWithdrawal)}`, color: "text-muted-foreground", icon: Info },
              ].map(s => (
                <Card key={s.label} className="glass-card">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <s.icon className={`w-5 h-5 ${s.color}`} />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground">{s.label}</div>
                      <div className={`font-heading font-bold text-lg ${s.color}`}>{s.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="glass-card">
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-sm">Processing Information</span>
                </div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {[
                    ["Processing Time", withdrawalProcessingTime || "Not provided"],
                    ["Withdrawal Fee (USD)", withdrawalTermsConfirmed ? formatSourceAmount(withdrawalFeeUsd, "USD") : "Unavailable"],
                    ...(withdrawalTermsConfirmed && withdrawalFeeCurrency !== "USD"
                      ? [["Fee Charged in Wallet", formatSourceAmount(withdrawalFee, withdrawalFeeCurrency)]]
                      : []),
                    ["Tax Treatment", "Not specified"],
                    ["Wallet Currency", currency || "Not provided"],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between gap-2">
                      <span className="text-muted-foreground">{l}</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Only the available balance returned by the investor service is considered for a withdrawal request. Any locked or pending amounts are not included as available funds.
              </p>
            </div>

            {pendingBalance != null && pendingBalance > 0 && (
              <p className="text-xs text-amber-600">Pending withdrawals reserved: {fmtW(pendingBalance)}</p>
            )}

            <Button className="w-full" onClick={() => void proceedToWithdrawForm()} disabled={balanceLoading || dashboardBalanceQuery.isError || availableBalance == null || maxWithdrawal == null || maxWithdrawal <= 0 || !withdrawalTermsConfirmed || !currency}>
              Proceed to Withdraw <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {step === "form" && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary" /> Bank Details & Amount
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <label className={`flex items-center gap-2 text-sm ${hasSavedBanks ? "cursor-pointer" : "opacity-60 cursor-not-allowed"}`}>
                <Checkbox
                  checked={autoFillBank && hasSavedBanks}
                  disabled={!hasSavedBanks}
                  onCheckedChange={v => {
                    if (!hasSavedBanks) return
                    const on = !!v
                    setAutoFillBank(on)
                    if (on && savedWithdrawBank) applyWithdrawBank(savedWithdrawBank)
                  }}
                />
                Use saved default account
              </label>
              {!hasSavedBanks && (
                <p className="text-xs text-muted-foreground -mt-3">
                  Save a bank account on your profile to enable autofill.
                </p>
              )}

              <div
                className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2 text-sm"
                data-testid="withdrawal-fee-summary"
              >
                <div className="font-semibold">Withdrawal fee and payout limit</div>
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Withdrawal fee (USD)</span>
                  <span className="font-medium" data-testid="withdrawal-fee-usd">
                    {withdrawalTermsConfirmed ? formatSourceAmount(withdrawalFeeUsd, "USD") : "Unavailable"}
                  </span>
                </div>
                {withdrawalTermsConfirmed && withdrawalFeeCurrency !== "USD" && (
                  <div className="flex justify-between gap-3">
                    <span className="text-muted-foreground">Fee charged in wallet</span>
                    <span className="font-medium" data-testid="withdrawal-fee-wallet">
                      {formatSourceAmount(withdrawalFee, withdrawalFeeCurrency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Maximum payout after fee</span>
                  <span className="font-semibold" data-testid="withdrawal-maximum-payout">
                    {maxWithdrawal == null ? "Unavailable" : formatSourceAmount(maxWithdrawal, currency)}
                  </span>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Withdrawal Amount <span className="text-red-400">*</span></Label>
                  <Input data-testid="withdrawal-amount" type="number" min={0} step="0.01" max={maxWithdrawal ?? undefined} placeholder="Enter amount" value={amount} onChange={e => { setAmount(e.target.value); setFormError("") }} />
                  <p className="text-xs text-muted-foreground">Maximum payout after fee: {dashboardBalanceQuery.isError ? "Unavailable" : dashboardBalanceQuery.isFetching ? "Refreshing…" : maxWithdrawal == null ? "Unavailable" : formatSourceAmount(maxWithdrawal, currency)}</p>
                  {exceedsBalance && <p className="text-xs text-red-500">Payout plus withdrawal fee cannot exceed available balance.</p>}
                  {amountNum > 0 && withdrawalTermsConfirmed && (
                    <p className="text-xs text-muted-foreground" data-testid="withdrawal-total-debit-preview">
                      Total wallet debit: {formatSourceAmount(
                        Math.round((Math.round(amountNum * 100) / 100 + (withdrawalFee ?? 0)) * 100) / 100,
                        currency,
                      )}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Currency</Label>
                  <Input value={currency} readOnly className="bg-muted/40 font-semibold" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Bank Name <span className="text-red-400">*</span></Label>
                  <Input placeholder="e.g. HBL, Standard Chartered" value={bankName} onChange={e => setBankName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Account Holder <span className="text-red-400">*</span></Label>
                  <Input placeholder="Full name as on account" value={accountHolder} onChange={e => setAccountHolder(e.target.value)} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Account Number <span className="text-red-400">*</span></Label>
                  <Input placeholder="Bank account number" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>IBAN</Label>
                  <Input placeholder="PK36SCBL0000001123456702" value={iban} onChange={e => setIban(e.target.value)} />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>SWIFT / BIC Code</Label>
                  <Input placeholder="e.g. SCBLPKKA" value={swift} onChange={e => setSwift(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Input placeholder="Branch name / city" value={branch} onChange={e => setBranch(e.target.value)} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Purpose</Label>
                <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={purpose} onChange={e => setPurpose(e.target.value)}>
                  <option value="">Select purpose</option>
                  <option>Profit Withdrawal</option>
                  <option>Principal Return</option>
                  <option>Business Expense</option>
                  <option>Personal Use</option>
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={saveBankDetails} onCheckedChange={v => setSaveBankDetails(!!v)} />
                Save bank details to my profile for future withdrawals
              </label>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-600">{formError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("overview")}>Back</Button>
                <Button
                  className="flex-1"
                  disabled={otpSending || balanceUnavailable || !withdrawalTermsConfirmed || maxWithdrawal == null || !amount || amountNum <= 0 || exceedsBalance || !currency || !bankName || !accountHolder || !accountNumber}
                  onClick={() => void handleContinueToSecurity()}
                >
                  {otpSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Continue to Security <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "security" && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" /> Security Verification
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {otpEmail ? `Code sent to ${otpEmail}` : "Enter the verification code sent to your registered email"}
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Lock className="w-4 h-4 text-primary" /> OTP Verification
                  </div>
                  <OtpInput
                    value={otp}
                    onChange={setOtp}
                    autoFocus
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    disabled={otpCooldown > 0 || otpSending}
                    onClick={() => void handleResendOtp()}
                  >
                    {otpCooldown > 0 ? `Resend OTP (${otpCooldown}s)` : "Resend OTP"}
                  </Button>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Lock className="w-4 h-4 text-accent" /> Transaction Password
                  </div>
                  <Input type="password" placeholder="Transaction password" value={txPassword} onChange={e => setTxPassword(e.target.value)} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Forgot password?{" "}
                    <button type="button" className="text-primary hover:underline" onClick={() => setShowResetModal(true)}>
                      Reset here
                    </button>
                    {" "}or set one in{" "}
                    <Link href="/invest/settings" className="text-primary hover:underline">Settings</Link>
                  </p>
                </div>
              </div>

              {formError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-600">{formError}</div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("form")} disabled={submitting}>Back</Button>
                <Button
                  className="flex-1"
                  disabled={submitting || otp.length !== 6 || !txPassword}
                  onClick={() => void handleVerifyAndContinue()}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Verify & Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "tracking" && (
          <div className="space-y-6">
            <Card className="glass-card border-emerald-500/30">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-heading font-bold">Withdrawal Submitted!</h2>
                <p className="text-muted-foreground">
                  Current status: {withdrawStatus ? paymentStatusLabel(withdrawStatus) : "Not provided"}.
                </p>
                <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 pt-2 text-left max-w-lg mx-auto">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Withdraw ID</div>
                    <div className="font-mono font-semibold text-sm">{withdrawId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Requested Amount</div>
                    <div className="font-semibold text-sm" data-testid="withdrawal-confirmed-payout">
                      {formatSourceAmount(readResponseAmount(withdrawalConfirmation?.amount) ?? amountNum, String(withdrawalConfirmation?.currency || currency))}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Withdrawal Fee (USD)</div>
                    <div className="font-semibold text-sm" data-testid="withdrawal-confirmed-fee-usd">
                      {formatSourceAmount(
                        readResponseAmount(withdrawalConfirmation?.fee_usd ?? withdrawalConfirmation?.withdrawal_fee_usd),
                        "USD",
                      )}
                    </div>
                  </div>
                  {String(withdrawalConfirmation?.currency || currency).toUpperCase() !== "USD" && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Fee Charged in Wallet</div>
                      <div className="font-semibold text-sm" data-testid="withdrawal-confirmed-fee-wallet">
                        {formatSourceAmount(
                          readResponseAmount(withdrawalConfirmation?.fee ?? withdrawalConfirmation?.withdrawal_fee),
                          String(withdrawalConfirmation?.currency || currency),
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Total Wallet Debit</div>
                    <div className="font-semibold text-sm" data-testid="withdrawal-confirmed-total-debit">
                      {formatSourceAmount(
                        readResponseAmount(withdrawalConfirmation?.total_debit),
                        String(withdrawalConfirmation?.currency || currency),
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Withdrawal Tracking
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <p>Current status: <span className="font-semibold">{withdrawStatus ? paymentStatusLabel(withdrawStatus) : "Not provided"}</span></p>
                  <p className="text-muted-foreground">Withdrawal history shows updates returned by the investor service.</p>
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full" onClick={() => { setStep("overview"); setAmount(""); setOtp(""); setTxPassword(""); setWithdrawalConfirmation(null); void refetchHistory() }}>
              New Withdrawal Request
            </Button>
          </div>
        )}

        <TransactionHistoryCard
          title="Your Withdrawal History"
          loading={historyLoading}
          emptyMessage="No withdrawals yet. Submit one above."
          items={withdrawalHistoryItems}
        />
      </div>

      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Transaction Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Login Password</Label>
              <Input type="password" value={resetForm.login} onChange={e => setResetForm(f => ({ ...f, login: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>New Transaction Password</Label>
              <Input type="password" value={resetForm.tx} onChange={e => setResetForm(f => ({ ...f, tx: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm Transaction Password</Label>
              <Input type="password" value={resetForm.confirm} onChange={e => setResetForm(f => ({ ...f, confirm: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetModal(false)}>Cancel</Button>
            <Button disabled={resetSaving || !resetForm.login || !resetForm.tx} onClick={() => void handleResetTxPassword()}>
              {resetSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </InvestPortalLayout>
  )
}
