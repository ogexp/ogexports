import { useState, useMemo } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Building2, Wifi, Globe, CreditCard, Upload, CheckCircle2,
  Clock, FileText, AlertCircle, ChevronRight, X, ArrowRight, Wallet, Zap, Loader2,
} from "lucide-react"

import { submitInvestorDeposit, mapInvestProject, type AdminInvestProject } from "@/lib/admin-data"
import { useLocalAuth } from "@/lib/local-auth"
import { useCurrency } from "@/lib/use-currency"
import { formatInvestorLedgerAmount } from "@/lib/format-investor-ledger"
import { formatInvestorProjectAmount } from "@/lib/invest-format"
import { api, unwrapPage } from "@/lib/api"
import { notify } from "@/lib/notify"
import { paymentStatusBadgeClass, paymentStatusLabel } from "@/lib/deposit-statuses"
import { useInvestorDashboardBalance } from "@/lib/investor-balance"
import { TransactionHistoryCard, type TransactionHistoryItem } from "@/components/invest/TransactionHistoryCard"
import { type BankAccount } from "@/lib/bank-accounts"
import { CompanyBankAccountsPanel } from "@/components/shared/CompanyBankAccountsPanel"
import { TransactionSuccessDialog } from "@/components/invest/TransactionSuccessDialog"
import { createTransactionReceipt, downloadTransactionReceipt } from "@/lib/transaction-receipt"

const DEPOSIT_CURRENCIES = ["USD", "GBP", "EUR", "CNY", "PKR", "SAR", "AED", "OMR", "QAR"] as const

type DepositHistoryFilters = {
  reference: string
  status: string
  date_from: string
  date_to: string
}

const EMPTY_DEPOSIT_HISTORY_FILTERS: DepositHistoryFilters = {
  reference: "",
  status: "",
  date_from: "",
  date_to: "",
}

const DEPOSIT_HISTORY_STATUSES = [
  { value: "", label: "Any status" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
]

const DEPOSIT_HISTORY_PAGE_SIZE = 20

function buildPaymentMethods() {
  return [
    {
      id: "bank",
      label: "Bank Transfer",
      icon: Building2,
      minDeposit: null,
      maxDeposit: null,
      processingTime: "Not provided",
      fee: "Not provided",
      description: "Direct bank transfer via local or international banking.",
    },
    {
      id: "wire",
      label: "Wire Transfer",
      icon: Wifi,
      minDeposit: null,
      maxDeposit: null,
      processingTime: "Not provided",
      fee: "Not provided",
      description: "International wire transfer for larger institutional deposits.",
    },
    {
      id: "swift",
      label: "SWIFT Transfer",
      icon: Globe,
      minDeposit: null,
      maxDeposit: null,
      processingTime: "Not provided",
      fee: "Not provided",
      description: "Global SWIFT payment network for cross-border transfers.",
    },
    {
      id: "online",
      label: "Online Banking",
      icon: CreditCard,
      minDeposit: null,
      maxDeposit: null,
      processingTime: "Not provided",
      fee: "Not provided",
      description: "Transfer securely from your online banking portal to an OG Exports account.",
    },
  ]
}

type Step = "method" | "form" | "upload" | "confirm" | "status"

export default function InvestDeposit() {
  const { user } = useLocalAuth()
  const c = useCurrency()
  const queryClient = useQueryClient()
  const dashboardBalanceQuery = useInvestorDashboardBalance()
  const walletBalance = dashboardBalanceQuery.data?.availableBalance ?? null
  const walletCurrency = dashboardBalanceQuery.data?.currency ?? ""
  const fmtW = (amount: number, usdAmount?: number | null) =>
    !walletCurrency
      ? "Not provided"
      : formatInvestorLedgerAmount(c, amount, {
      usdAmount,
      ledgerCurrency: walletCurrency,
      lockedRate: c.isPK && c.rate > 0 ? c.rate : null,
    })
  const [depositCurrency, setDepositCurrency] = useState<string>("")
  const [step, setStep] = useState<Step>("method")
  const [selectedMethod, setSelectedMethod] = useState("")
  const [amount, setAmount] = useState("")
  const [purpose, setPurpose] = useState("")
  const [reference, setReference] = useState("")
  const [notes, setNotes] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [depositId, setDepositId] = useState("")
  const [refNum, setRefNum] = useState("")
  const [selectedProjectId, setSelectedProjectId] = useState("")
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("")
  const [liveStatus, setLiveStatus] = useState<string>("")
  const [successDialogOpen, setSuccessDialogOpen] = useState(false)
  const [successStatus, setSuccessStatus] = useState("")
  const [submittedRecord, setSubmittedRecord] = useState<Record<string, unknown> | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | undefined>()
  const [historyPage, setHistoryPage] = useState(1)
  const [historyFilters, setHistoryFilters] = useState<DepositHistoryFilters>(EMPTY_DEPOSIT_HISTORY_FILTERS)
  const [historyDraftFilters, setHistoryDraftFilters] = useState<DepositHistoryFilters>(EMPTY_DEPOSIT_HISTORY_FILTERS)

  const { data: liveProjects = [] } = useQuery<AdminInvestProject[]>({
    queryKey: ["investor", "deposit-options"],
    queryFn: async () => {
      const res = await api.get("/api/investor/deposit-options")
      const rows = Array.isArray((res as any)?.data) ? (res as any).data : Array.isArray(res) ? res : []
      return rows.map((p: any) => {
        const mapped = mapInvestProject(p)
        const rawStatus = String(p.status || "").toLowerCase()
        return {
          ...mapped,
          title: p.title || mapped.title,
          target: mapped.target,
          raised: mapped.raised,
          roi: p.roi_label || (p.expected_return_pct != null ? `${p.expected_return_pct}%` : mapped.roi),
          // Keep funding/active so deposit dropdown filter works for all project types
          status: rawStatus === "active" ? "active" : rawStatus === "funding" ? "funding" : mapped.status,
        } as AdminInvestProject
      }).filter((p: AdminInvestProject) => p.status === "funding" || p.status === "active")
    },
  })
  const selectedProject = liveProjects.find(p => p.id === selectedProjectId)

  const PAYMENT_METHODS = useMemo(() => buildPaymentMethods(), [])

  const historyQueryParams = useMemo(() => ({
    page: historyPage,
    per_page: DEPOSIT_HISTORY_PAGE_SIZE,
    ...(historyFilters.reference ? { reference: historyFilters.reference } : {}),
    ...(historyFilters.status ? { status: historyFilters.status } : {}),
    ...(historyFilters.date_from ? { date_from: historyFilters.date_from } : {}),
    ...(historyFilters.date_to ? { date_to: historyFilters.date_to } : {}),
  }), [historyFilters, historyPage])
  const historyQuery = useQuery({
    queryKey: ["investor", "deposits", historyQueryParams],
    queryFn: () => api.get("/api/investor/deposits", historyQueryParams),
  })
  const { data: historyPayload, isLoading: historyLoading, refetch: refetchHistory } = historyQuery
  const historyPageData = useMemo(() => unwrapPage<any>(historyPayload), [historyPayload])
  const depositHistory = historyPageData.data
  const historyDateRangeInvalid = Boolean(
    historyDraftFilters.date_from
    && historyDraftFilters.date_to
    && historyDraftFilters.date_to < historyDraftFilters.date_from,
  )

  const method = PAYMENT_METHODS.find(m => m.id === selectedMethod)
  const amountNum = parseFloat(amount) || 0
  const isWalletMethod = selectedMethod === "wallet"
  const requiresBankDetails = ["bank", "wire", "swift", "online"].includes(selectedMethod)
  const walletProject = liveProjects.find(p => p.id === selectedProjectId)
  const walletAmountError = isWalletMethod && dashboardBalanceQuery.isError
    ? "Available balance could not be loaded from the investor dashboard."
    : isWalletMethod && dashboardBalanceQuery.isFetching
      ? "Checking your current available balance…"
    : isWalletMethod && (walletBalance == null || !walletCurrency)
      ? "Wallet balance or currency is not available."
    : isWalletMethod && walletProject && !walletProject.currency
      ? "Project currency is not provided."
      : isWalletMethod && walletProject?.currency === walletCurrency && walletBalance != null && amountNum > walletBalance
        ? `Amount cannot exceed your available wallet balance (${fmtW(walletBalance)})`
        : null
  const walletBalanceLabel = dashboardBalanceQuery.isFetching
    ? "…"
    : dashboardBalanceQuery.isError
      ? "Unavailable"
      : walletBalance == null
        ? "Not provided"
        : fmtW(walletBalance)
  const walletProjectRequired = isWalletMethod && !selectedProjectId
    ? "Select a project to invest from your OG Wallet"
    : null
  const normalizedSuccessStatus = successStatus.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  const successStatusNeedsAttention = ["rejected", "declined", "failed", "error", "cancelled", "canceled"].includes(normalizedSuccessStatus)
  const successIsConfirmed = isWalletMethod
    ? ["completed", "settled", "confirmed", "success", "successful"].includes(normalizedSuccessStatus)
    : ["settled", "completed", "credited"].includes(normalizedSuccessStatus)
  const successIsApproved = isWalletMethod
    ? ["approved", "active"].includes(normalizedSuccessStatus)
    : normalizedSuccessStatus === "approved"
  const successTransaction = isWalletMethod ? "investment" : "deposit"
  const successTitle = successStatusNeedsAttention
    ? `${isWalletMethod ? "Investment" : "Deposit"} status updated`
    : successIsApproved
      ? isWalletMethod
        ? normalizedSuccessStatus === "active" ? "Investment active" : "Investment approved"
        : "Deposit approved"
      : successIsConfirmed
        ? isWalletMethod ? "Investment confirmed" : `Deposit ${paymentStatusLabel(successStatus).toLowerCase()}`
        : `${isWalletMethod ? "Investment" : "Deposit"} request submitted`
  const successDescription = successStatus
    ? successStatusNeedsAttention
      ? `OG Exports reports this ${successTransaction} as ${paymentStatusLabel(successStatus)}. Review the returned status before relying on any wallet movement.`
      : successIsApproved
        ? isWalletMethod
          ? `OG Exports reports this investment as ${paymentStatusLabel(successStatus)}. This status does not indicate that the investment is complete.`
          : "OG Exports reports this deposit as approved. This does not confirm that the wallet has been credited."
        : successIsConfirmed
          ? `OG Exports reports this ${successTransaction} as ${paymentStatusLabel(successStatus)}.`
          : `Your ${successTransaction} request was received with status ${paymentStatusLabel(successStatus)}. Check your investor records for updates.`
    : `Your ${successTransaction} request was received. Its server status and any funds movement appear in your investor records.`
  const successTone = successStatusNeedsAttention
    ? "attention"
    : successIsApproved ? "approved" : successIsConfirmed ? "confirmed" : "submitted"
  const formCanContinue = Boolean(amount) && amountNum > 0
    && (isWalletMethod ? Boolean(walletProject?.currency) : Boolean(depositCurrency))
    && (!isWalletMethod ? Boolean(purpose) : Boolean(selectedProjectId) && !walletAmountError)
    && (!requiresBankDetails || Boolean(selectedBankAccountId))

  function formatDepositAmount(d: {
    amount?: number | string
    currency?: string
    original_amount?: number | string
    original_currency?: string
    converted_amount?: number | string | null
    wallet_currency?: string | null
  }) {
    const walletCur = String(d.wallet_currency || d.currency || "").trim().toUpperCase()
    const originalCur = String(d.original_currency || d.currency || "").trim().toUpperCase()
    const rawWalletAmount = d.converted_amount ?? d.amount
    const rawOriginalAmount = d.original_amount ?? d.amount
    if (!walletCur || rawWalletAmount == null || String(rawWalletAmount).trim() === "") return "Not provided"
    const walletAmt = Number(rawWalletAmount)
    const originalAmt = rawOriginalAmount == null || String(rawOriginalAmount).trim() === ""
      ? null
      : Number(rawOriginalAmount)
    if (!Number.isFinite(walletAmt) || (originalAmt != null && !Number.isFinite(originalAmt))) return "Not provided"

    if (walletCur === "PKR") {
      if (originalCur === "USD" && originalAmt != null && originalAmt > 0) {
        return formatInvestorLedgerAmount(c, walletAmt, {
          usdAmount: originalAmt,
          ledgerCurrency: "PKR",
        })
      }
      return formatInvestorLedgerAmount(c, walletAmt, { ledgerCurrency: "PKR" })
    }

    if (!originalCur || originalAmt == null) return "Not provided"
    return formatInvestorProjectAmount(originalAmt, originalCur)
  }

  function formatMethodLabel(method?: string) {
    if (!method) return "Deposit"
    const labels: Record<string, string> = {
      wallet: "OG Wallet",
      bank: "Bank Transfer",
      bank_transfer: "Bank Transfer",
      wire: "Wire Transfer",
      swift: "SWIFT Transfer",
      online: "Online Banking",
    }
    return labels[method.toLowerCase()] || method
  }

  const depositHistoryItems: TransactionHistoryItem[] = depositHistory.map((d: any) => ({
    id: String(d.id),
    primary: `${formatMethodLabel(d.method)} · ${formatDepositAmount(d)}`,
    reference: d.reference || undefined,
    paymentReference: d.bank_reference || undefined,
    date: d.created_at
      ? new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : undefined,
    status: d.review_status || d.status,
    statusLabel: d.review_status_label || paymentStatusLabel(d.status),
    receipt: createTransactionReceipt("deposit", d),
    detailHref: /^\d+$/.test(String(d.id ?? "")) ? `/invest/transactions/deposit/${d.id}` : undefined,
  }))

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = Array.from(e.dataTransfer.files)
    setFiles(prev => [...prev, ...dropped])
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...selected])
    e.target.value = ""
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const amountNum = parseFloat(amount) || 0

      if (isWalletMethod) {
        if (!selectedProjectId) {
          notify.error(walletProjectRequired || "Select a project to invest from your OG Wallet")
          return
        }
        if (
          amountNum <= 0
          || walletBalance == null
          || !walletCurrency
          || !walletProject
          || (walletProject.currency === walletCurrency && amountNum > walletBalance)
        ) {
          notify.error(walletAmountError || "Invalid investment amount")
          return
        }
        const res: any = await api.post(`/api/investor/projects/${selectedProjectId}/invest`, { amount: amountNum })
        const data = res?.data ?? res
        setSubmittedRecord(data && typeof data === "object" ? data as Record<string, unknown> : null)
        const ref = data?.reference || (data?.id ? `INV-${data.id}` : "submitted")
        setDepositId(String(data?.id ?? ref))
        setRefNum(String(ref))
        setLiveStatus(String(data?.status || data?.state || "submitted"))
        setStep("status")
        notify.success("Investment request submitted")
        void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
        void queryClient.invalidateQueries({ queryKey: ["investor", "wallet"] })
        return
      }

      let proofPath: string | undefined
      if (files.length > 0) {
        const fd = new FormData()
        fd.append("file", files[0])
        fd.append("folder", "deposit-proofs")
        const up = await api.upload<{ data: { path: string } }>("/api/uploads", fd)
        proofPath = up.data?.path
      }
      const submitted = await submitInvestorDeposit({
        investor: user?.fullName || "Investor",
        email: user?.email || "",
        amount: `${amount} ${depositCurrency}`,
        method: method?.label || selectedMethod,
        ref: reference || `REF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        projectId: selectedProjectId || undefined,
        projectTitle: selectedProject?.title,
        amountNum,
        currency: depositCurrency,
        proofPath,
        bankAccountId: selectedBankAccountId || undefined,
        bankAccountName: selectedBankAccount?.bankName,
        note: notes,
      })
      setDepositId(submitted.reference || submitted.id)
      setRefNum(submitted.bankReference || reference || "—")
      setSuccessStatus(submitted.status || "")
      setSubmittedRecord(submitted.serverRecord)
      setLiveStatus(submitted.status || "submitted")
      setStep("status")
      setSuccessDialogOpen(true)
      void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
      void refetchHistory()
    } catch (err: any) {
      notify.error(err?.message || "Unable to submit deposit. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <InvestPortalLayout title="Deposit Funds" subtitle="Add capital to your investment account">
      <div className="max-w-3xl mx-auto space-y-6">
        {isWalletMethod && dashboardBalanceQuery.isError && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-red-500/25 bg-red-500/5 px-4 py-3 text-sm text-red-600">
            <span>Available balance could not be loaded from the investor dashboard.</span>
            <Button variant="outline" size="sm" onClick={() => void dashboardBalanceQuery.refetch()}>
              Retry
            </Button>
          </div>
        )}
        {/* Progress indicator */}
        {step !== "status" && (
          <div className="flex items-center gap-1">
            {(["method", "form", "upload", "confirm"] as Step[]).map((s, i, arr) => (
              <div key={s} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${step === s ? "text-primary" : arr.indexOf(step) > i ? "text-emerald-500" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step === s ? "bg-primary text-primary-foreground" : arr.indexOf(step) > i ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground"}`}>
                    {arr.indexOf(step) > i ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className="hidden sm:block capitalize">{s === "method" ? "Payment Method" : s === "form" ? "Deposit Details" : s === "upload" ? "Upload Proof" : "Review"}</span>
                </div>
                {i < arr.length - 1 && <div className={`h-px flex-1 mx-2 transition-colors ${arr.indexOf(step) > i ? "bg-emerald-500" : "bg-border"}`} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Payment method */}
        {step === "method" && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-heading font-semibold">Select Payment Method</h2>
              <p className="text-sm text-muted-foreground">Choose your preferred way to deposit funds</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {PAYMENT_METHODS.map(pm => {
                const isSelected = selectedMethod === pm.id
                return (
                  <Card
                    key={pm.id}
                    className={`cursor-pointer transition-all hover:-translate-y-0.5 ${isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : "glass-card hover:border-border/80"}`}
                    onClick={() => setSelectedMethod(pm.id)}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <pm.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <span className="font-semibold">{pm.label}</span>
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                      </div>

                      <p className="text-xs text-muted-foreground">{pm.description}</p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Min / Max</div>
                          <div className="text-xs font-semibold">
                            {pm.minDeposit == null ? "Not published" : formatInvestorProjectAmount(pm.minDeposit, depositCurrency)}
                            {" / "}
                            {pm.maxDeposit == null ? "Not published" : formatInvestorProjectAmount(pm.maxDeposit, walletCurrency)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Processing</div>
                          <div className="text-xs font-semibold">{pm.processingTime}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Currency</div>
                          <div className="text-xs font-semibold">{walletCurrency || "Not provided"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Fees</div>
                          <div className="text-xs font-semibold">{pm.fee}</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
            <Button
              className="w-full"
              disabled={!selectedMethod}
              onClick={() => setStep("form")}
            >
              Continue <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Deposit form */}
        {step === "form" && method && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading flex items-center gap-2">
                <method.icon className="w-5 h-5 text-primary" />
                {method.label} — Deposit Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Amount <span className="text-red-400">*</span></Label>
                  <Input
                    type="number"
                    placeholder={method.minDeposit == null ? "Enter amount" : `Min ${formatInvestorProjectAmount(method.minDeposit, depositCurrency)}`}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                  {method.maxDeposit != null && (
                    <p className="text-xs text-muted-foreground">
                      Max: {formatInvestorProjectAmount(method.maxDeposit, walletCurrency)}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{isWalletMethod ? "Project Currency" : "Deposit Currency"}</Label>
                  {isWalletMethod ? (
                    <Input value={walletProject?.currency || "Not provided"} readOnly className="bg-muted/40 font-semibold" />
                  ) : (
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                      value={depositCurrency}
                      onChange={e => setDepositCurrency(e.target.value)}
                    >
                      <option value="" disabled>Select currency</option>
                      {DEPOSIT_CURRENCIES.map(code => (
                        <option key={code} value={code}>{code}</option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {isWalletMethod
                      ? "Wallet investment requests use the project currency; submission is blocked if it differs from your wallet currency."
                      : "Deposit currency is your selection. Wallet currency and any conversion are shown only when confirmed by the investor service."}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Payment Method</Label>
                <Input value={method.label} readOnly className="bg-muted/40" />
              </div>
              {requiresBankDetails && (
                <CompanyBankAccountsPanel
                  selectedId={selectedBankAccountId}
                  onSelect={(id, account) => {
                    setSelectedBankAccountId(id)
                    setSelectedBankAccount(account)
                  }}
                  queryKey={["investor", "payment-bank-accounts"]}
                  description="Transfer the exact deposit amount to one of the active company accounts below, then upload the payment proof."
                  footerHint="Use your deposit reference in the bank transfer description and upload a clear receipt. Funds are credited after finance verification."
                />
              )}
              <div className="space-y-1.5">
                <Label>{isWalletMethod ? "Invest In" : "Invest In (Optional)"} {isWalletMethod && <span className="text-red-400">*</span>}</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={selectedProjectId}
                  onChange={e => { setSelectedProjectId(e.target.value); if (e.target.value) setPurpose("New Investment") }}
                >
                  {!isWalletMethod && (
                    <option value="">— General deposit / no specific project —</option>
                  )}
                  {isWalletMethod && !selectedProjectId && (
                    <option value="">— Select a project —</option>
                  )}
                  {liveProjects.map(p => {
                    const hasFunding = p.targetAmountAvailable === true
                      && p.raisedAmountAvailable === true
                      && p.target > 0
                      && Boolean(p.currency)
                    const pct = hasFunding ? Math.round((p.raised / p.target) * 100) : null
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title}
                        {p.roi !== "—" ? ` — ${p.roi} expected return` : ""}
                        {hasFunding
                          ? ` — ${formatInvestorProjectAmount(p.raised, p.currency)} raised / ${formatInvestorProjectAmount(p.target, p.currency)} target (${pct}% recorded)`
                          : " — funding figures not provided"}
                      </option>
                    )
                  })}
                </select>
                {selectedProject && (
                  <div className="mt-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/8 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Project</span>
                      <span className="font-semibold">{selectedProject.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Target</span>
                      <span className="font-semibold">
                        {selectedProject.targetAmountAvailable && selectedProject.currency
                          ? formatInvestorProjectAmount(selectedProject.target, selectedProject.currency)
                          : "Not provided"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Raised so far</span>
                      <span className="font-semibold text-emerald-500">
                        {selectedProject.raisedAmountAvailable && selectedProject.currency
                          ? `${formatInvestorProjectAmount(selectedProject.raised, selectedProject.currency)}${selectedProject.targetAmountAvailable && selectedProject.target > 0 ? ` (${Math.round((selectedProject.raised / selectedProject.target) * 100)}%)` : ""}`
                          : "Not provided"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected ROI</span>
                      <span className="font-bold text-emerald-500">{selectedProject.roi}</span>
                    </div>
                    <p className="text-emerald-600 dark:text-emerald-400 pt-1">
                      {isWalletMethod
                        ? "✓ Funds will be reserved from your wallet immediately and held pending admin approval."
                        : "✓ Your deposit will be reviewed by our finance team before being applied to this project."}
                    </p>
                  </div>
                )}
                {walletProjectRequired && step === "form" && (
                  <p className="text-xs text-amber-600">{walletProjectRequired}</p>
                )}
                {walletAmountError && step === "form" && (
                  <p className="text-xs text-red-500">{walletAmountError}</p>
                )}
              </div>
              {!isWalletMethod && (
              <div className="space-y-1.5">
                <Label>Purpose</Label>
                <select
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  value={purpose}
                  onChange={e => setPurpose(e.target.value)}
                >
                  <option value="">Select purpose</option>
                  <option>New Investment</option>
                  <option>Top-up Existing Investment</option>
                  <option>Add to Available Balance</option>
                </select>
              </div>
              )}
              {!isWalletMethod && (
              <div className="space-y-1.5">
                <Label>Bank / Wire Reference Number</Label>
                <Input placeholder="Your bank transaction reference" value={reference} onChange={e => setReference(e.target.value)} />
              </div>
              )}
              {!isWalletMethod && (
              <div className="space-y-1.5">
                <Label>Additional Notes</Label>
                <textarea
                  className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
                  placeholder="Any additional information for our finance team"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>
              )}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("method")}>Back</Button>
                <Button className="flex-1" disabled={!formCanContinue} onClick={() => setStep("upload")}>
                  Continue <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Upload proof — skipped for wallet payments */}
        {step === "upload" && selectedMethod === "wallet" && (
          <Card className="glass-card border-emerald-500/30">
            <CardContent className="p-8 text-center space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <Wallet className="w-7 h-7 text-emerald-500" />
              </div>
              <h3 className="text-lg font-heading font-bold">No Receipt Needed</h3>
              <p className="text-sm text-muted-foreground">
                OG Wallet payments are processed internally.<br />No bank receipt or transfer proof is required.
              </p>
              <div className="bg-emerald-500/8 border border-emerald-500/20 rounded-xl p-4 space-y-1.5 text-sm text-left">
                <div className="flex justify-between"><span className="text-muted-foreground">Wallet Balance</span><span className="font-bold text-emerald-500">{walletBalanceLabel}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Requested Amount</span><span className="font-bold text-foreground">− {amount || "0"} {isWalletMethod ? walletCurrency : depositCurrency}</span></div>
                <div className="flex justify-between border-t border-border/50 pt-1.5 mt-1.5"><span className="text-muted-foreground">Remaining After</span><span className="font-bold">{walletBalance == null ? "Not provided" : fmtW(Math.max(0, walletBalance - amountNum))}</span></div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("form")} className="flex-1">Back</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => setStep("confirm")}>
                  Review & Confirm <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "upload" && selectedMethod !== "wallet" && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading">Upload Payment Proof</CardTitle>
              <p className="text-sm text-muted-foreground">Upload your transaction receipt, bank screenshot, or payment confirmation</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div
                className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleFileDrop}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="font-semibold text-foreground">Drag & Drop files here</p>
                <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
                <p className="text-xs text-muted-foreground mt-3">Supported: PDF, JPG, PNG, JPEG · Max 10 MB per file</p>
                <input id="file-input" type="file" multiple accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileInput} />
              </div>

              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                      <FileText className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm flex-1 truncate">{f.name}</span>
                      <div className="text-xs text-emerald-500 font-medium">Ready</div>
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                        <X className="w-4 h-4 text-muted-foreground hover:text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("form")}>Back</Button>
                <Button className="flex-1" onClick={() => setStep("confirm")}>
                  Preview & Submit <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && method && (
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading">Review Deposit</CardTitle>
              <p className="text-sm text-muted-foreground">Please verify all details before submitting</p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-xl border border-border bg-muted/20 divide-y divide-border">
                {[
                  ["Payment Method", method.label],
                  ["Amount", `${amount} ${isWalletMethod ? walletCurrency : depositCurrency}`],
                  ["Invest In", selectedProject ? selectedProject.title : "General Balance"],
                  ["Expected ROI", selectedProject ? selectedProject.roi : "—"],
                  ["Purpose", purpose],
                  ["Reference Number", reference || "—"],
                  ["Documents", files.length > 0 ? `${files.length} file(s) uploaded` : "None"],
                  ["Processing Time", method.processingTime],
                  ["Fees", method.fee],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex items-center justify-between px-4 py-3">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm font-semibold ${label === "Expected ROI" && selectedProject ? "text-emerald-500" : ""}`}>{val}</span>
                  </div>
                ))}
              </div>

              {requiresBankDetails && selectedBankAccount && (
                <div data-testid="review-bank-details" className="space-y-3 rounded-xl border border-border bg-muted/20 p-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Receiving account details</p>
                    <p className="mt-1 text-sm font-semibold">{selectedBankAccount.bankName || "Bank account"}</p>
                    {selectedBankAccount.accountTitle && (
                      <p className="mt-0.5 text-xs text-muted-foreground">{selectedBankAccount.accountTitle}</p>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { label: "Account number", value: selectedBankAccount.accountNumber, testId: "review-account-number" },
                      { label: "IBAN", value: selectedBankAccount.iban, testId: "review-iban" },
                      { label: "SWIFT / BIC", value: selectedBankAccount.swift, testId: "review-swift" },
                    ].map(({ label, value, testId }) => (
                      <div key={label} data-testid={testId} className="min-w-0 rounded-lg border border-border/70 bg-background px-3 py-2.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                        <p className="mt-1 break-all font-mono text-xs font-semibold leading-relaxed">{value || "Not provided"}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  By submitting, you confirm that the payment details are accurate and that the funds originate from a legitimate source. Fees and processing time are not published here; use the status returned by the investor service for updates.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
                <Button className="flex-1 bg-primary" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting…</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> {isWalletMethod ? "Submit Investment" : "Submit Deposit"}</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 5: Status */}
        {step === "status" && (
          <div className="space-y-6">
            <Card className="glass-card border-emerald-500/30">
              <CardContent className="p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-9 h-9 text-emerald-500" />
                </div>
                <h2 className="text-2xl font-heading font-bold">{isWalletMethod ? "Investment Submitted!" : "Deposit Submitted!"}</h2>
                <p className="text-muted-foreground">
                  {isWalletMethod && selectedProject
                    ? <>Your investment request for <span className="font-semibold text-foreground">{selectedProject.title}</span> was submitted. Check its returned status and wallet records for updates.</>
                    : selectedProject
                    ? <>Your deposit request for <span className="font-semibold text-foreground">{selectedProject.title}</span> was submitted. Check the status returned by the investor service for updates.</>
                    : "Your deposit request was submitted. Check the investor records for its current status."}
                </p>
                {submittedRecord ? (
                  <Button
                    variant="outline"
                    size="sm"
                    data-testid="deposit-submission-receipt"
                    onClick={() => downloadTransactionReceipt(createTransactionReceipt(
                      isWalletMethod ? "investment" : "deposit",
                      submittedRecord,
                    ))}
                  >
                    <FileText className="mr-2 h-4 w-4" /> Download receipt file
                  </Button>
                ) : null}
                <div className="flex justify-center gap-6 pt-2 flex-wrap">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Deposit ID</div>
                    <div className="font-mono font-semibold text-sm">{depositId || "Not provided"}</div>
                  </div>
                  {!isWalletMethod && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Bank Reference</div>
                      <div className="font-mono font-semibold text-sm">{refNum || "—"}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Requested Amount</div>
                    <div className="font-semibold text-sm">
                      {formatInvestorProjectAmount(amountNum, isWalletMethod ? walletCurrency : depositCurrency)}
                    </div>
                  </div>
                  {selectedProject && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Project ROI</div>
                      <div className="font-semibold text-sm text-emerald-500">{selectedProject.roi}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Deposit Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">Status returned by investor service</p>
                  <Badge className={`border-0 text-[10px] ${paymentStatusBadgeClass(liveStatus)}`}>
                    {liveStatus ? paymentStatusLabel(liveStatus) : "Not provided"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is the status returned with your request. Future updates appear when returned by the investor service.
                </p>
                <Button size="sm" variant="outline" onClick={() => void refetchHistory()}>Refresh transaction history</Button>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => { setStep("method"); setAmount(""); setFiles([]); setSelectedMethod(""); void refetchHistory() }}>
              Make Another Deposit
            </Button>
          </div>
        )}

        <form
          className="space-y-4 rounded-xl border border-border/60 bg-card/60 p-4"
          onSubmit={event => {
            event.preventDefault()
            if (historyDateRangeInvalid) return
            setHistoryPage(1)
            setHistoryFilters({
              ...historyDraftFilters,
              reference: historyDraftFilters.reference.trim(),
            })
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="deposit-history-reference">Reference</Label>
              <Input
                id="deposit-history-reference"
                data-testid="deposit-history-reference"
                value={historyDraftFilters.reference}
                onChange={event => setHistoryDraftFilters(filters => ({ ...filters, reference: event.target.value }))}
                placeholder="Search deposit or transfer reference"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit-history-status">Status</Label>
              <select
                id="deposit-history-status"
                data-testid="deposit-history-status"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={historyDraftFilters.status}
                onChange={event => setHistoryDraftFilters(filters => ({ ...filters, status: event.target.value }))}
              >
                {DEPOSIT_HISTORY_STATUSES.map(status => (
                  <option key={status.value || "any"} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit-history-date-from">From date</Label>
              <Input
                id="deposit-history-date-from"
                data-testid="deposit-history-date-from"
                type="date"
                max={historyDraftFilters.date_to || undefined}
                value={historyDraftFilters.date_from}
                onChange={event => setHistoryDraftFilters(filters => ({ ...filters, date_from: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deposit-history-date-to">To date</Label>
              <Input
                id="deposit-history-date-to"
                data-testid="deposit-history-date-to"
                type="date"
                min={historyDraftFilters.date_from || undefined}
                value={historyDraftFilters.date_to}
                onChange={event => setHistoryDraftFilters(filters => ({ ...filters, date_to: event.target.value }))}
              />
            </div>
          </div>
          {historyDateRangeInvalid && (
            <p role="alert" className="text-sm text-destructive">
              End date must be on or after the start date.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" disabled={historyDateRangeInvalid} data-testid="deposit-history-apply">
              Apply filters
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="deposit-history-clear"
              onClick={() => {
                setHistoryDraftFilters({ ...EMPTY_DEPOSIT_HISTORY_FILTERS })
                setHistoryFilters({ ...EMPTY_DEPOSIT_HISTORY_FILTERS })
                setHistoryPage(1)
              }}
            >
              Clear filters
            </Button>
          </div>
        </form>

        {historyQuery.isError ? (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            <span>Deposit history could not be loaded.</span>
            <Button variant="outline" size="sm" onClick={() => void historyQuery.refetch()}>
              Retry
            </Button>
          </div>
        ) : (
          <>
            <TransactionHistoryCard
              title="Your Deposit History"
              loading={historyLoading}
              emptyMessage="No deposits match these filters."
              items={depositHistoryItems}
            />
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground" data-testid="deposit-history-page">
                Page {historyPage} of {historyPageData.meta.last_page} · {historyPageData.meta.total} matching deposits
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="deposit-history-previous"
                  disabled={historyLoading || historyPage <= 1}
                  onClick={() => setHistoryPage(page => Math.max(1, page - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  data-testid="deposit-history-next"
                  disabled={historyLoading || historyPage >= historyPageData.meta.last_page}
                  onClick={() => setHistoryPage(page => Math.min(historyPageData.meta.last_page, page + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
        <TransactionSuccessDialog
          open={successDialogOpen}
          onOpenChange={setSuccessDialogOpen}
          title={successTitle}
          description={successDescription}
          tone={successTone}
          status={successStatus || undefined}
        />
      </div>
    </InvestPortalLayout>
  )
}
