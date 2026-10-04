import { useState, useEffect, useMemo } from "react"
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
import { api, unwrapPage } from "@/lib/api"
import { notify } from "@/lib/notify"
import { normalizeReviewStatus, paymentStatusBadgeClass, paymentStatusLabel } from "@/lib/deposit-statuses"
import { TransactionHistoryCard, type TransactionHistoryItem } from "@/components/invest/TransactionHistoryCard"
import { type BankAccount } from "@/lib/bank-accounts"
import { CompanyBankAccountsPanel } from "@/components/shared/CompanyBankAccountsPanel"

const DEPOSIT_CURRENCIES = ["USD", "GBP", "EUR", "CNY", "PKR", "SAR", "AED", "OMR", "QAR"] as const

function buildPaymentMethods(walletBalance: number) {
  return [
    {
      id: "wallet",
      label: "OG Wallet",
      icon: Wallet,
      minDeposit: 100,
      maxDeposit: Math.max(walletBalance, 100),
      processingTime: "Instant",
      fee: "0%",
      description: "Use your available OG Exports account balance — instant allocation, no bank transfer or receipt required.",
    },
    {
      id: "bank",
      label: "Bank Transfer",
      icon: Building2,
      minDeposit: 500,
      maxDeposit: 500000,
      processingTime: "1–2 Business Days",
      fee: "0%",
      description: "Direct bank transfer via local or international banking.",
    },
    {
      id: "wire",
      label: "Wire Transfer",
      icon: Wifi,
      minDeposit: 1000,
      maxDeposit: 1000000,
      processingTime: "1–3 Business Days",
      fee: "0%",
      description: "International wire transfer for larger institutional deposits.",
    },
    {
      id: "swift",
      label: "SWIFT Transfer",
      icon: Globe,
      minDeposit: 2000,
      maxDeposit: 5000000,
      processingTime: "2–5 Business Days",
      fee: "0%",
      description: "Global SWIFT payment network for cross-border transfers.",
    },
    {
      id: "online",
      label: "Online Banking",
      icon: CreditCard,
      minDeposit: 100,
      maxDeposit: 50000,
      processingTime: "Same Day",
      fee: "0%",
      description: "Transfer securely from your online banking portal to an OG Exports account.",
    },
  ]
}

const STATUS_STEPS = [
  { label: "Pending", desc: "Deposit submitted" },
  { label: "Under Review", desc: "Finance team reviewing" },
  { label: "Verified", desc: "Documents verified" },
  { label: "Approved", desc: "Funds credited" },
  { label: "Completed", desc: "Investment active" },
]

type Step = "method" | "form" | "upload" | "confirm" | "status"

export default function InvestDeposit() {
  const { user } = useLocalAuth()
  const c = useCurrency()
  const queryClient = useQueryClient()
  const [ledgerWalletCurrency, setLedgerWalletCurrency] = useState(c.walletCurrency)
  const walletCurrency = ledgerWalletCurrency
  const fmtW = (amount: number, usdAmount?: number | null) =>
    formatInvestorLedgerAmount(c, amount, {
      usdAmount,
      ledgerCurrency: ledgerWalletCurrency,
      lockedRate: c.isPK && c.rate > 0 ? c.rate : null,
    })
  const [depositCurrency, setDepositCurrency] = useState<string>(c.symLabel)
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
  const [liveStatus, setLiveStatus] = useState<string>("pending")
  const [walletBalance, setWalletBalance] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [selectedBankAccount, setSelectedBankAccount] = useState<BankAccount | undefined>()

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
          target: Number(p.target_amount ?? mapped.target) || 0,
          raised: Number(p.raised_amount ?? mapped.raised) || 0,
          roi: p.roi_label || (p.expected_return_pct != null ? `${p.expected_return_pct}%` : mapped.roi),
          // Keep funding/active so deposit dropdown filter works for all project types
          status: rawStatus === "active" ? "active" : rawStatus === "funding" ? "funding" : mapped.status,
        } as AdminInvestProject
      }).filter((p: AdminInvestProject) => p.status === "funding" || p.status === "active")
    },
  })
  const selectedProject = liveProjects.find(p => p.id === selectedProjectId)

  useEffect(() => {
    api.get("/api/investor/wallet").then((res: any) => {
      const wallet = res?.data ?? res
      setWalletBalance(Number(wallet?.available_balance ?? 0))
      const cur = String(wallet?.currency || c.walletCurrency || "USD").toUpperCase()
      setLedgerWalletCurrency(cur)
    }).catch(() => setWalletBalance(0))
  }, [c.walletCurrency])

  const PAYMENT_METHODS = useMemo(() => buildPaymentMethods(walletBalance), [walletBalance])

  const { data: historyPayload, isLoading: historyLoading, refetch: refetchHistory } = useQuery({
    queryKey: ["investor", "deposits"],
    queryFn: () => api.get("/api/investor/deposits", { per_page: 20 }),
  })
  const depositHistory = unwrapPage<any>(historyPayload).data

  const method = PAYMENT_METHODS.find(m => m.id === selectedMethod)
  const amountNum = parseFloat(amount) || 0
  const isWalletMethod = selectedMethod === "wallet"
  const requiresBankDetails = ["bank", "wire", "swift", "online"].includes(selectedMethod)
  const walletAmountError = isWalletMethod && amountNum > walletBalance
    ? `Amount cannot exceed your available wallet balance (${fmtW(walletBalance)})`
    : null
  const walletProjectRequired = isWalletMethod && !selectedProjectId
    ? "Select a project to invest from your OG Wallet"
    : null
  const normalizedLive = normalizeReviewStatus(liveStatus)
  const statusStepIndex =
    normalizedLive === "approved" ? 3
      : normalizedLive === "rejected" || normalizedLive === "cancelled" ? 1
        : 0

  const formCanContinue = Boolean(amount) && amountNum > 0
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
    const walletCur = String(d.wallet_currency || d.currency || depositCurrency).toUpperCase()
    const originalCur = String(d.original_currency || d.currency || "").toUpperCase()
    const walletAmt = Number(d.converted_amount ?? d.amount) || 0
    const originalAmt = Number(d.original_amount ?? d.amount) || 0

    if (walletCur === "PKR") {
      if (originalCur === "USD" && originalAmt > 0) {
        return formatInvestorLedgerAmount(c, walletAmt, {
          usdAmount: originalAmt,
          ledgerCurrency: "PKR",
        })
      }
      return formatInvestorLedgerAmount(c, walletAmt, { ledgerCurrency: "PKR" })
    }

    return formatInvestorLedgerAmount(c, Number(d.amount) || 0, {
      ledgerCurrency: String(d.currency || depositCurrency).toUpperCase(),
    })
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
    reference: d.reference || `OGDEP-INV-${String(d.id).padStart(3, "0")}`,
    date: d.created_at
      ? new Date(d.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : undefined,
    status: d.review_status || d.status,
    statusLabel: d.review_status_label || paymentStatusLabel(d.status),
    pdfPath: `/api/investor/deposits/${d.id}/pdf`,
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
        if (amountNum <= 0 || amountNum > walletBalance) {
          notify.error(walletAmountError || "Invalid investment amount")
          return
        }
        const res: any = await api.post(`/api/investor/projects/${selectedProjectId}/invest`, { amount: amountNum })
        const data = res?.data ?? res
        const ref = data?.reference || (data?.id ? `INV-${data.id}` : "submitted")
        setDepositId(String(data?.id ?? ref))
        setRefNum(String(ref))
        setLiveStatus("pending")
        setStep("status")
        setWalletBalance(prev => Math.max(0, prev - amountNum))
        notify.success("Investment submitted — pending admin approval")
        void queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
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
      setLiveStatus("pending")
      setStep("status")
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
                const isWallet = pm.id === "wallet"
                const isSelected = selectedMethod === pm.id
                return (
                  <Card
                    key={pm.id}
                    className={`cursor-pointer transition-all hover:-translate-y-0.5 ${isSelected ? "border-primary ring-1 ring-primary bg-primary/5" : isWallet ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/70" : "glass-card hover:border-border/80"}`}
                    onClick={() => setSelectedMethod(pm.id)}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isWallet ? "bg-emerald-500/15" : "bg-primary/10"}`}>
                            <pm.icon className={`w-5 h-5 ${isWallet ? "text-emerald-500" : "text-primary"}`} />
                          </div>
                          <div>
                            <span className="font-semibold">{pm.label}</span>
                            {isWallet && <div className="flex items-center gap-1 mt-0.5"><Zap className="w-3 h-3 text-emerald-500" /><span className="text-[10px] text-emerald-500 font-semibold">Instant — No Bank Transfer</span></div>}
                          </div>
                        </div>
                        {isSelected && <CheckCircle2 className="w-5 h-5 text-primary" />}
                      </div>

                      {isWallet && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-3 flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Available Balance</span>
                          <span className="text-lg font-heading font-bold text-emerald-500">{fmtW(walletBalance)}</span>
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground">{pm.description}</p>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Min / Max</div>
                          <div className="text-xs font-semibold">{c.fmt(pm.minDeposit)} / {c.fmt(pm.maxDeposit)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Processing</div>
                          <div className={`text-xs font-semibold ${isWallet ? "text-emerald-500" : ""}`}>{pm.processingTime}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Currency</div>
                          <div className="text-xs font-semibold">{walletCurrency}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Fees</div>
                          <div className="text-xs font-semibold text-emerald-500">{pm.fee}</div>
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
                    placeholder={`Min ${c.fmt(method.minDeposit)}`}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">Max: {c.fmt(method.maxDeposit)}</p>
                </div>
                <div className="space-y-1.5">
                  <Label>Deposit Currency</Label>
                  <select
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm font-semibold"
                    value={depositCurrency}
                    onChange={e => setDepositCurrency(e.target.value)}
                  >
                    {DEPOSIT_CURRENCIES.map(code => (
                      <option key={code} value={code}>{code}</option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Deposit recorded in {depositCurrency}. Your wallet is credited in {walletCurrency} after approval at the prevailing exchange rate.
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
                    const pct = Math.round((p.raised / p.target) * 100)
                    const remaining = p.target - p.raised
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title} — {p.roi} ROI — {c.fmtDual(remaining)} remaining ({pct}% funded)
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
                      <span className="font-semibold">{c.fmtDual(selectedProject.target)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Raised so far</span>
                      <span className="font-semibold text-emerald-500">{c.fmtDual(selectedProject.raised)} ({Math.round((selectedProject.raised / selectedProject.target) * 100)}%)</span>
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
                <div className="flex justify-between"><span className="text-muted-foreground">Wallet Balance</span><span className="font-bold text-emerald-500">{fmtW(walletBalance)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Deduction</span><span className="font-bold text-foreground">− {amount || "0"} {depositCurrency}</span></div>
                <div className="flex justify-between border-t border-border/50 pt-1.5 mt-1.5"><span className="text-muted-foreground">Remaining After</span><span className="font-bold">{fmtW(Math.max(0, walletBalance - amountNum))}</span></div>
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
                  ["Amount", `${amount} ${depositCurrency}`],
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

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  By submitting, you confirm that the payment details are accurate and that the funds originate from a legitimate source. Our team will review and approve within {method.processingTime}.
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
                    ? <>Your investment in <span className="font-semibold text-foreground">{selectedProject.title}</span> is pending admin approval. Funds have been reserved from your wallet.</>
                    : selectedProject
                    ? <>Your deposit for <span className="font-semibold text-foreground">{selectedProject.title}</span> is under review. You'll be notified once approved.</>
                    : "Your deposit is under review. You'll be notified once approved."}
                </p>
                <div className="flex justify-center gap-6 pt-2 flex-wrap">
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Deposit ID</div>
                    <div className="font-mono font-semibold text-sm">{depositId}</div>
                  </div>
                  {!isWalletMethod && (
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Bank Reference</div>
                      <div className="font-mono font-semibold text-sm">{refNum || "—"}</div>
                    </div>
                  )}
                  <div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">Amount</div>
                    <div className="font-semibold text-sm">
                      {Number(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {depositCurrency}
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
                  <p className="text-sm text-muted-foreground">Admin review status</p>
                  <Badge className={`border-0 text-[10px] ${paymentStatusBadgeClass(liveStatus)}`}>
                    {paymentStatusLabel(liveStatus)}
                  </Badge>
                </div>
                <div className="relative">
                  <div className="absolute left-4 top-4 bottom-4 w-px bg-border" />
                  {STATUS_STEPS.map((s, i) => {
                    const active = i === statusStepIndex
                    const done = i < statusStepIndex
                    return (
                      <div key={s.label} className="relative flex items-start gap-4 pb-6 last:pb-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 shrink-0 ${
                          active ? "bg-amber-500/20 border-2 border-amber-500"
                            : done ? "bg-emerald-500/20 border-2 border-emerald-500"
                              : "bg-muted border-2 border-border"
                        }`}>
                          {done
                            ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            : active
                              ? <Clock className="w-3.5 h-3.5 text-amber-500" />
                              : <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                        </div>
                        <div className="pt-1">
                          <div className={`text-sm font-semibold ${active ? "text-amber-500" : done ? "text-emerald-600" : "text-muted-foreground"}`}>{s.label}</div>
                          <div className="text-xs text-muted-foreground">{s.desc}</div>
                        </div>
                        {active && <Badge className="ml-auto mt-1 bg-amber-500/15 text-amber-600 border-0 text-xs">Current</Badge>}
                      </div>
                    )
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Status updates automatically after admin approve / reject / cancel on Investor Deposits.
                </p>
                <Button size="sm" variant="outline" onClick={() => void refetchHistory()}>Refresh status</Button>
              </CardContent>
            </Card>

            <Button className="w-full" onClick={() => { setStep("method"); setAmount(""); setFiles([]); setSelectedMethod(""); void refetchHistory() }}>
              Make Another Deposit
            </Button>
          </div>
        )}

        <TransactionHistoryCard
          title="Your Deposit History"
          loading={historyLoading}
          emptyMessage="No deposits yet. Submit one above."
          items={depositHistoryItems}
        />
      </div>
    </InvestPortalLayout>
  )
}
