import { useEffect, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useLocation } from "wouter"
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { ChevronRight, ShieldCheck, Wallet, Loader2, AlertCircle } from "lucide-react"
import { ContainerInvestment, LongTermProject } from "@/data/investments"
import { api, ApiError } from "@/lib/api"
import { formatInvestorProjectAmount } from "@/lib/invest-format"
import { INVESTOR_DASHBOARD_QUERY_KEY, useInvestorDashboardBalance } from "@/lib/investor-balance"
import {
  TransactionSuccessContent,
  type TransactionSuccessTone,
} from "@/components/invest/TransactionSuccessContent"
import { createTransactionReceipt, downloadTransactionReceipt } from "@/lib/transaction-receipt"

interface InvestNowModalProps {
  investment: ContainerInvestment | LongTermProject
  initialAmount: number
  isOpen: boolean
  onClose: () => void
  onSuccess?: (result: Record<string, any>) => void
  remainingAmount?: number | null
  isFull?: boolean
  redirectTo?: string
}

const STEPS = ["Summary", "Amount", "Agreement", "Status"]

export function InvestNowModal({
  investment,
  initialAmount,
  isOpen,
  onClose,
  onSuccess,
  remainingAmount,
  isFull = false,
  redirectTo = "/invest/dashboard",
}: InvestNowModalProps) {
  const { toast } = useToast()
  const [, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const dashboardBalanceQuery = useInvestorDashboardBalance(isOpen)
  const walletBalance = isOpen ? dashboardBalanceQuery.data?.availableBalance ?? null : null
  const walletCurrency = isOpen ? dashboardBalanceQuery.data?.currency ?? "" : ""
  const walletLoading = isOpen && dashboardBalanceQuery.isFetching
  const [step, setStep] = useState(0)
  const [amount, setAmount] = useState(initialAmount > 0 ? initialAmount.toString() : "")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [riskAcknowledged, setRiskAcknowledged] = useState(false)
  const [confirmation, setConfirmation] = useState<{
    reference: string | null
    status: string | null
    message: string
    serverRecord: Record<string, unknown>
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const isProject = "category" in investment
  const itemName = isProject ? investment.name : investment.commodity
  const returnPct = investment.expectedReturnPct
  const termProvided = isProject
    ? investment.investmentPeriodDays != null || investment.investmentPeriodMonths != null
    : investment.investmentPeriodDays != null
  const remaining = remainingAmount ?? null
  const full = isFull === true || (remaining != null && remaining <= 0)
  const termsProvided = Boolean(investment.currency)
    && investment.minInvestment != null
    && termProvided
  const walletCurrencyMatches = Boolean(
    investment.currency && walletCurrency
      && investment.currency.toUpperCase() === walletCurrency,
  )
  const canContinue = !full
    && termsProvided
    && remaining != null
    && walletBalance != null
    && walletCurrencyMatches
    && !walletLoading
    && !dashboardBalanceQuery.isError

  useEffect(() => {
    if (!isOpen) return
    setStep(0)
    setAmount(initialAmount > 0
      ? String(initialAmount)
      : investment.minInvestment != null
        ? String(investment.minInvestment)
        : "")
    setTermsAccepted(false)
    setRiskAcknowledged(false)
    setConfirmation(null)
  }, [isOpen, initialAmount, investment.minInvestment])

  const handleNext = () => setStep(s => Math.min(s + 1, STEPS.length - 1))
  const handleBack = () => setStep(s => Math.max(s - 1, 0))

  const value = Number(amount) || 0
  const walletDebitNeeded = value

  const amountError = (() => {
    if (full) return "This opportunity is fully subscribed."
    if (!termsProvided) return "Required investment terms or project currency are not provided."
    if (remaining == null) return "Available funding capacity is not provided."
    if (dashboardBalanceQuery.isError) return "Available balance could not be loaded from the investor dashboard."
    if (walletLoading) return "Refreshing your available balance…"
    if (walletBalance == null || !walletCurrency) return "Wallet balance or currency is not available."
    if (!walletCurrencyMatches) return "Wallet and project currencies do not match; conversion terms are not provided."
    if (investment.minInvestment == null) return "Minimum investment is not provided."
    if (value < investment.minInvestment) return `Minimum investment is ${formatInvestorProjectAmount(investment.minInvestment, investment.currency)}`
    if (investment.maxInvestment != null && value > investment.maxInvestment) return `Maximum investment is ${formatInvestorProjectAmount(investment.maxInvestment, investment.currency)}`
    if (value > remaining) return `Only ${formatInvestorProjectAmount(remaining, investment.currency)} remaining capacity`
    if (walletDebitNeeded > walletBalance) return `Amount cannot exceed wallet balance (${formatInvestorProjectAmount(walletBalance, walletCurrency)})`
    return null
  })()
  const normalizedInvestmentStatus = (confirmation?.status || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
  const investmentServerCompleted = ["completed", "settled", "confirmed", "success", "successful"].includes(normalizedInvestmentStatus)
  const investmentServerApproved = ["approved", "active"].includes(normalizedInvestmentStatus)
  const investmentServerRejected = ["failed", "error", "rejected", "declined", "cancelled", "canceled"].includes(normalizedInvestmentStatus)
  const investmentSuccessTone: TransactionSuccessTone = investmentServerRejected
    ? "attention"
    : investmentServerApproved ? "approved" : investmentServerCompleted ? "confirmed" : "submitted"
  const investmentSuccessTitle = investmentServerRejected
    ? "Investment status updated"
    : investmentServerApproved
      ? normalizedInvestmentStatus === "active" ? "Investment active" : "Investment approved"
      : investmentServerCompleted ? "Investment confirmed" : "Investment request submitted"
  const investmentSuccessDescription = investmentServerRejected
    ? confirmation?.message || `OG Exports reports this investment as ${confirmation?.status}. Review the returned status before relying on a wallet debit.`
    : investmentServerApproved
      ? `OG Exports reports this investment as ${confirmation?.status}. This status does not indicate that the investment is complete.`
      : investmentServerCompleted
        ? confirmation?.message || `OG Exports reports this investment as ${confirmation?.status}.`
        : confirmation?.message || "OG Exports accepted your investment request. Its server status and any funds movement are shown in your investor records."

  const handleSubmit = async () => {
    if (amountError || !termsAccepted || !riskAcknowledged) return
    setSubmitting(true)
    try {
      const res: any = await api.post(`/api/investor/projects/${investment.id}/invest`, { amount: value })
      const body = res && typeof res === "object" ? res : {}
      const record = body?.data && typeof body.data === "object" ? body.data : body
      const reference = typeof record?.reference === "string" && record.reference.trim()
        ? record.reference.trim()
        : null
      const status = typeof record?.status === "string" && record.status.trim()
        ? record.status.trim()
        : null
      const normalizedStatus = (status || "").toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim()
      const message = typeof body?.message === "string" && body.message.trim()
        ? body.message.trim()
        : ["failed", "error", "rejected", "declined", "cancelled", "canceled"].includes(normalizedStatus)
          ? `OG Exports reported that this investment request was ${status}.`
          : "The investor service accepted the request."
      const transactionRecord = record?.investment ?? record?.position ?? record
      setConfirmation({ reference, status, message, serverRecord: transactionRecord })
      setStep(3)
      void queryClient.invalidateQueries({ queryKey: INVESTOR_DASHBOARD_QUERY_KEY })
      onSuccess?.(body)
    } catch (e: any) {
      const msg =
        e instanceof ApiError
          ? (e.errors?.amount?.[0] || e.message)
          : e?.message || "Investment failed"
      toast({ title: "Could not invest", description: String(msg), variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-0 overflow-hidden bg-card border-border/60">
        <div className={`bg-muted/30 px-6 ${step === 3 ? "py-3" : "py-4"} border-b border-border/50`}>
          {step === 3 ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Investment status</p>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-heading font-semibold">Complete Your Investment</h2>
                <div className="text-sm font-medium text-muted-foreground">Step {Math.min(step + 1, STEPS.length)} of {STEPS.length}</div>
              </div>
              <div className="flex gap-1">
                {STEPS.map((s, i) => (
                  <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-primary/20"}`} />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-6">
          {step === 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading font-semibold text-lg">{itemName}</h3>
                  <p className="text-sm text-muted-foreground">{isProject ? "Long-Term Project" : "Container Export"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 bg-muted/20 p-4 rounded-xl border border-border/50">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Expected Return</div>
                  <div className="font-semibold text-emerald-500">
                    {returnPct == null ? "Not provided" : `${returnPct}% ${isProject ? "Annual" : "Total"}`}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Term</div>
                  <div className="font-semibold">
                    {isProject
                      ? investment.investmentPeriodDays != null
                        ? `${investment.investmentPeriodDays} Days`
                        : (investment.investmentPeriodMonths == null ? "Not provided" : `${investment.investmentPeriodMonths} Months`)
                      : (investment.investmentPeriodDays == null ? "Not provided" : `${investment.investmentPeriodDays} Days`)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Remaining Capacity</div>
                  <div className="font-semibold">{formatInvestorProjectAmount(remaining, investment.currency)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Wallet Balance</div>
                  <div className="font-semibold flex items-center gap-1">
                    <Wallet className="w-3.5 h-3.5" />
                    {walletLoading ? "…" : formatInvestorProjectAmount(walletBalance, walletCurrency)}
                  </div>
                </div>
              </div>
              {full && (
                <div className="bg-amber-500/10 border border-amber-500/20 text-amber-700 p-3 rounded-xl text-sm flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Fully subscribed — no slots remaining.
                </div>
              )}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium">Investment Amount ({investment.currency})</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{investment.currency}</span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    min={investment.minInvestment ?? undefined}
                    max={Math.min(investment.maxInvestment ?? Infinity, remaining ?? Infinity)}
                    className="pl-8 text-lg h-12"
                    disabled={!canContinue}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Minimum: {formatInvestorProjectAmount(investment.minInvestment, investment.currency)}
                  {investment.maxInvestment != null ? ` · Maximum: ${formatInvestorProjectAmount(investment.maxInvestment, investment.currency)}` : ""}
                  {" · "}Remaining: {formatInvestorProjectAmount(remaining, investment.currency)}
                </p>
                {amountError && <p className="text-xs text-red-500">{amountError}</p>}
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-sm gap-2">
                  <span className="text-muted-foreground shrink-0">Investment Amount</span>
                  <span className="font-semibold text-right">{formatInvestorProjectAmount(value, investment.currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Investment outcomes and settlement amounts depend on the final project records. No return estimate is calculated here.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="font-heading font-semibold text-lg">Investment Agreement</h3>
              <div className="h-48 overflow-y-auto p-4 bg-muted/20 border border-border/50 rounded-xl text-xs text-muted-foreground space-y-4">
                <p className="font-semibold text-foreground">OG EXPORTS — PROFIT SHARING AGREEMENT</p>
                <p>Your request will be sent to the investor service. Its returned status and wallet records are the source of truth for confirmation and any funds movement.</p>
                <p>1. <strong>Capital at Risk:</strong> All investments involve risk. Capital is not guaranteed.</p>
                <p>2. <strong>Returns:</strong> Any published rate is an estimate, not a guarantee. If no rate is shown, consult the signed project terms.</p>
                <p>3. <strong>Settlement:</strong> Amounts and timing are determined by the final project records and agreement.</p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start space-x-2">
                  <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(!!checked)} />
                  <label htmlFor="terms" className="text-sm font-medium leading-snug">
                    I agree to the investment terms for this opportunity.
                  </label>
                </div>
                <div className="flex items-start space-x-2">
                  <Checkbox id="risk" checked={riskAcknowledged} onCheckedChange={(checked) => setRiskAcknowledged(!!checked)} />
                  <label htmlFor="risk" className="text-sm font-medium leading-snug">
                    I understand that capital is at risk and returns are not guaranteed.
                  </label>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <TransactionSuccessContent
              title={investmentSuccessTitle}
              description={investmentSuccessDescription}
              tone={investmentSuccessTone}
              status={confirmation?.status}
              reference={confirmation?.reference}
              context={itemName}
            />
          )}
        </div>

        <DialogFooter className="p-6 pt-0 sm:justify-between flex-row-reverse border-t border-border/50 mt-2">
          {step < 3 && (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={step === 0 ? onClose : handleBack} disabled={submitting}>
                {step === 0 ? "Cancel" : "Back"}
              </Button>
              {step === 0 && (
                <Button onClick={handleNext} disabled={!canContinue}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === 1 && (
                <Button onClick={handleNext} disabled={!!amountError || value <= 0}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )}
              {step === 2 && (
                <Button onClick={() => void handleSubmit()} disabled={!termsAccepted || !riskAcknowledged || submitting || !!amountError}>
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Confirm Invest
                </Button>
              )}
            </div>
          )}
          {step === 3 && (
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                data-testid="investment-submission-receipt"
                onClick={() => {
                  try {
                    downloadTransactionReceipt(createTransactionReceipt("investment", confirmation?.serverRecord))
                  } catch {
                    toast({ title: "Receipt unavailable", description: "Could not download the transaction receipt." })
                  }
                }}
              >
                Download receipt
              </Button>
              <Button variant="outline" onClick={onClose} className="flex-1">Done</Button>
              <Button onClick={() => { setLocation(redirectTo); onClose() }} className="flex-1">View dashboard</Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
