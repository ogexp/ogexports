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
import { formatInvestorLedgerAmount } from "@/lib/format-investor-ledger"
import { api, unwrapPage, ApiError } from "@/lib/api"
import { paymentStatusLabel } from "@/lib/deposit-statuses"
import { TransactionHistoryCard, type TransactionHistoryItem } from "@/components/invest/TransactionHistoryCard"
import { notify } from "@/lib/notify"
import {
  type InvestorBankAccount,
  defaultBankAccount,
  hasUsableBankAccount,
  normalizeBankAccount,
} from "@/lib/investor-bank-accounts"

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

const TRACKING_STEPS = [
  { label: "Pending", desc: "Withdrawal request submitted", done: true },
  { label: "Verification", desc: "Identity verification in progress", done: false },
  { label: "Finance Review", desc: "Finance team processing", done: false },
  { label: "Approved", desc: "Withdrawal approved", done: false },
  { label: "Transferred", desc: "Funds sent to your bank", done: false },
  { label: "Completed", desc: "Funds received", done: false },
]

export default function InvestWithdraw() {
  const { user } = useLocalAuth()
  const c = useCurrency()
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>("overview")
  const [amount, setAmount] = useState("")
  const [currency, setCurrency] = useState(c.isPK ? "PKR" : "USD")
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
  const [availableBalance, setAvailableBalance] = useState(0)
  const [pendingBalance, setPendingBalance] = useState(0)
  const [ledgerCurrency, setLedgerCurrency] = useState(c.walletCurrency)
  const fmtW = (amount: number, usdAmount?: number | null) =>
    formatInvestorLedgerAmount(c, amount, {
      usdAmount,
      ledgerCurrency,
      lockedRate: c.isPK && c.rate > 0 ? c.rate : null,
    })
  const [walletLoading, setWalletLoading] = useState(true)
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

  const withdrawableBalance = availableBalance
  const minWithdrawal = 100
  const maxWithdrawal = availableBalance
  const fee = amount ? Math.max(0, parseFloat(amount) * 0.001).toFixed(2) : "0.00"
  const finalAmount = amount ? (parseFloat(amount) - parseFloat(fee)).toFixed(2) : "0.00"
  const amountNum = parseFloat(amount) || 0
  const exceedsBalance = amountNum > availableBalance

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
      setAvailableBalance(Number(wallet?.available_balance ?? 0))
      setPendingBalance(Number(wallet?.pending_balance ?? 0))
      const cur = String(wallet?.currency || c.walletCurrency || "USD").toUpperCase()
      setLedgerCurrency(cur)
      setCurrency(cur)
    } catch {
      setAvailableBalance(0)
      setPendingBalance(0)
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

  function formatWithdrawAmount(amt: number, lockedRate?: number | null, amountUsd?: number | null) {
    return formatInvestorLedgerAmount(c, Number(amt) || 0, {
      usdAmount: amountUsd,
      ledgerCurrency,
      lockedRate,
    })
  }

  const withdrawalHistoryItems: TransactionHistoryItem[] = useMemo(
    () => (withdrawalHistory || []).map((w: any) => {
      const bankDetails = w.bank_details || {}
      const bank = bankDetails.bank_name || bankDetails.bank || w.bank_name || w.bank || "Bank Transfer"
      const ref = w.withdraw_id || w.reference || `OGWITH-INV-${String(w.id).padStart(3, "0")}`
      const lockedRate = w.exchange_rate != null ? Number(w.exchange_rate) : null
      const amountUsd = w.amount_usd != null ? Number(w.amount_usd) : null
      return {
        id: String(w.id),
        primary: `${bank} · ${formatWithdrawAmount(Number(w.amount ?? 0), lockedRate, amountUsd)}`,
        reference: ref,
        date: w.created_at
          ? new Date(w.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : undefined,
        status: w.status || "pending",
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
    if (!amount || exceedsBalance || amountNum < minWithdrawal || !bankName || !accountHolder || !accountNumber) {
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
    if (amountNum <= 0 || amountNum > availableBalance || amountNum < minWithdrawal) {
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
      const ref = data?.withdraw_id || data?.reference || ""
      setWithdrawId(ref)
      setAvailableBalance(prev => Math.max(0, prev - amountNum))
      setPendingBalance(prev => prev + amountNum)
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
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: "Available Balance", value: fmtW(availableBalance), color: "text-foreground", icon: Wallet },
                { label: "Withdrawable Balance", value: fmtW(withdrawableBalance), color: "text-emerald-500", icon: CheckCircle2 },
                { label: "Min / Max Withdrawal", value: `${fmtW(minWithdrawal)} / ${fmtW(Math.max(maxWithdrawal, 0))}`, color: "text-muted-foreground", icon: Info },
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
                    ["Estimated Processing Time", "1–3 Business Days"],
                    ["Withdrawal Charges", `0.1% (min ${c.sym}0)`],
                    ["Tax Deduction", "None"],
                    ["Supported Currencies", currency],
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
                Withdrawals from active investments require the investment to reach maturity. Only your available balance is immediately withdrawable.
              </p>
            </div>

            {pendingBalance > 0 && (
              <p className="text-xs text-amber-600">Pending withdrawals reserved: {fmtW(pendingBalance)}</p>
            )}

            <Button className="w-full" onClick={() => void proceedToWithdrawForm()} disabled={availableBalance <= 0}>
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

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Withdrawal Amount <span className="text-red-400">*</span></Label>
                  <Input type="number" min={0} max={availableBalance} placeholder="Enter amount" value={amount} onChange={e => { setAmount(e.target.value); setFormError("") }} />
                  <p className="text-xs text-muted-foreground">Max withdrawable: {fmtW(withdrawableBalance)}</p>
                  {exceedsBalance && <p className="text-xs text-red-500">Amount cannot exceed available balance.</p>}
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
                  disabled={otpSending || !amount || exceedsBalance || amountNum < minWithdrawal || !bankName || !accountHolder || !accountNumber}
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
                <p className="text-muted-foreground">Our finance team will process your request within 1–3 business days.</p>
                <div className="flex justify-center gap-6 pt-2 flex-wrap">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Withdraw ID</div>
                    <div className="font-mono font-semibold text-sm">{withdrawId}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Amount</div>
                    <div className="font-semibold text-sm">{formatWithdrawAmount(parseFloat(finalAmount))}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">ETA</div>
                    <div className="font-semibold text-sm">1–3 Business Days</div>
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
                <div className="relative">
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />
                  {TRACKING_STEPS.map((s, i) => (
                    <div key={s.label} className="relative flex items-start gap-4 pb-6 last:pb-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${s.done ? "bg-emerald-500/20 border-2 border-emerald-500" : i === 1 ? "bg-amber-500/20 border-2 border-amber-500" : "bg-muted border-2 border-border"}`}>
                        {s.done
                          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          : i === 1
                          ? <Clock className="w-3.5 h-3.5 text-amber-500" />
                          : <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        }
                      </div>
                      <div className="pt-1">
                        <div className={`text-sm font-semibold ${s.done ? "text-emerald-500" : i === 1 ? "text-amber-500" : "text-muted-foreground"}`}>{s.label}</div>
                        <div className="text-xs text-muted-foreground">{s.desc}</div>
                      </div>
                      {i === 1 && <Badge className="ml-auto mt-1 bg-amber-500/15 text-amber-600 border-0 text-xs">In Progress</Badge>}
                      {s.done && <Badge className="ml-auto mt-1 bg-emerald-500/15 text-emerald-600 border-0 text-xs">Done</Badge>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button variant="outline" className="w-full" onClick={() => { setStep("overview"); setAmount(""); setOtp(""); setTxPassword(""); void refetchHistory() }}>
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
