import { useEffect, useState } from "react"
import { Link, useParams } from "wouter"
import { ArrowLeft, Check, Copy, Loader2, ReceiptText } from "lucide-react"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { createTransactionReceipt, downloadTransactionReceipt } from "@/lib/transaction-receipt"
import { resolveInvestorTransactionPaymentMethod } from "@/lib/investor-transaction-method"
import { copyFinancialReference, resolveCanonicalFinancialId, resolveFinancialCopyTarget } from "@/lib/financial-reference"
import { notify } from "@/lib/notify"

type TransactionKind = "deposit" | "withdrawal" | "wallet"
type TransactionRecord = Record<string, unknown>

async function fetchInvestorTransactionRecord(
  kind: TransactionKind | null,
  id: string,
): Promise<TransactionRecord | null> {
  if (!kind || !id) return null
  if (kind === "wallet") {
    const response = await api.get<{ data?: TransactionRecord } & TransactionRecord>(
      `/api/investor/wallet/transactions/${id}`,
    )
    return response?.data ?? response ?? null
  }

  const response = await api.get<{ data?: TransactionRecord } & TransactionRecord>(
    `/api/investor/${kind}s/${id}`,
  )
  return response?.data ?? response ?? null
}

function text(value: unknown, fallback = "Not recorded") {
  if (value === null || value === undefined || value === "") return fallback
  if (typeof value === "object") return fallback
  return String(value)
}

function recordedMoney(value: unknown, currency: string, usdEquivalent?: unknown) {
  const amount = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== ""
      ? Number(value)
      : Number.NaN
  if (!Number.isFinite(amount)) return "Not recorded"
  const code = currency.trim().toUpperCase()
  let sourceAmount = amount.toFixed(2)
  try {
    if (code) sourceAmount = new Intl.NumberFormat(undefined, { style: "currency", currency: code }).format(amount)
  } catch {
    if (code) sourceAmount = `${amount.toFixed(2)} ${code}`
  }
  const equivalent = numericValue(usdEquivalent)
  return code && code !== "USD" && equivalent !== null
    ? `${sourceAmount} (${recordedMoney(equivalent, "USD")} USD equivalent)`
    : sourceAmount
}

function numericValue(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value)
  return null
}

function validRelatedId(...values: unknown[]) {
  for (const value of values) {
    if (typeof value !== "string" && typeof value !== "number") continue
    const id = String(value).trim()
    if (/^[1-9]\d*$/.test(id) && Number.isSafeInteger(Number(id))) return id
  }
  return ""
}

function formatDate(value: unknown) {
  const raw = text(value, "")
  if (!raw) return "Not recorded"
  const date = new Date(raw)
  return Number.isNaN(date.getTime()) ? raw : date.toLocaleString()
}

export default function InvestorTransactionDetail() {
  const params = useParams<{ type: string; id: string }>()
  const kind = params.type === "deposit" || params.type === "withdrawal" || params.type === "wallet"
    ? params.type as TransactionKind
    : null
  const id = /^\d+$/.test(params.id || "") ? params.id : ""
  const [record, setRecord] = useState<TransactionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [copiedRecordId, setCopiedRecordId] = useState("")
  const title = kind === "deposit" ? "Deposit details" : kind === "withdrawal" ? "Withdrawal details" : "Transaction details"
  const backHref = kind === "deposit" ? "/invest/deposit" : kind === "withdrawal" ? "/invest/withdraw" : "/invest/wallet"
  const backLabel = kind === "deposit" ? "deposits" : kind === "withdrawal" ? "withdrawals" : "wallet"

  useEffect(() => {
    if (!kind || !id) {
      setLoading(false)
      setError(true)
      setRecord(null)
      return
    }

    let cancelled = false
    const load = async () => {
      setLoading(true)
      setRecord(null)
      setError(false)
      try {
        const response = await fetchInvestorTransactionRecord(kind, id)
        if (!cancelled) setRecord(response)
      } catch {
        if (!cancelled) {
          setRecord(null)
          setError(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [kind, id])

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      if (!kind || !id) return
      setError(false)
      void fetchInvestorTransactionRecord(kind, id)
        .then(response => {
          if (!cancelled) setRecord(response)
        })
        .catch(() => {
          if (!cancelled) setError(true)
        })
    }
    window.addEventListener("og-investor-records-updated", refresh)
    return () => {
      cancelled = true
      window.removeEventListener("og-investor-records-updated", refresh)
    }
  }, [kind, id])

  const canonicalRecordId = resolveCanonicalFinancialId(record, ["id", "transaction_id"])
  const copyTarget = resolveFinancialCopyTarget(
    record,
    ["id", "transaction_id"],
    ["transaction_id", "reference", "transaction_reference", "deposit_reference", "withdraw_id"],
  )
  const recordIdLabel = kind === "wallet" ? "Transaction ID" : "Record ID"
  const status = text(record?.review_status ?? record?.status)
  const reference = copyTarget?.kind === "reference"
    ? copyTarget.value
    : text(record?.reference ?? record?.transaction_reference ?? record?.deposit_reference ?? record?.withdraw_id)
  const amount = text(record?.amount)
  const meta = record?.meta && typeof record.meta === "object" ? record.meta as TransactionRecord : {}
  const metaWithdrawalBreakdown = meta.withdrawal_breakdown && typeof meta.withdrawal_breakdown === "object"
    ? meta.withdrawal_breakdown as TransactionRecord
    : {}
  const recordWithdrawalBreakdown = record?.withdrawal_breakdown && typeof record.withdrawal_breakdown === "object"
    ? record.withdrawal_breakdown as TransactionRecord
    : {}
  const withdrawalBreakdown = { ...metaWithdrawalBreakdown, ...recordWithdrawalBreakdown }
  const bankDetails = record?.bank_details && typeof record.bank_details === "object"
    ? record.bank_details as TransactionRecord
    : {}
  const currency = text(
    record?.wallet_currency ?? record?.currency ?? record?.amount_currency
      ?? withdrawalBreakdown.wallet_currency ?? withdrawalBreakdown.currency
      ?? bankDetails.currency ?? meta.wallet_currency ?? meta.currency,
    "",
  )
  const walletType = text(record?.type ?? record?.transaction_type, "").toLowerCase()
  const isWithdrawalTransaction = kind === "withdrawal"
    || (kind === "wallet" && /withdraw|payout/.test(walletType))
  const paymentMethod = resolveInvestorTransactionPaymentMethod(
    [record ?? {}, bankDetails, meta],
    isWithdrawalTransaction,
  )
  const exchangeRate = numericValue(
    record?.exchange_rate ?? withdrawalBreakdown.exchange_rate
      ?? meta.exchange_rate ?? metaWithdrawalBreakdown.exchange_rate,
  )
  const exchangeRateLabel = currency.trim().toUpperCase() === "USD"
    ? "Not applicable (USD)"
    : exchangeRate === null
      ? "Not recorded"
      : `1 USD = ${exchangeRate.toLocaleString(undefined, { maximumFractionDigits: 8 })} ${currency || "PKR"}`
  const payoutValue = numericValue(
    kind === "withdrawal"
      ? record?.amount ?? withdrawalBreakdown.payout_amount ?? withdrawalBreakdown.amount
      : withdrawalBreakdown.payout_amount ?? withdrawalBreakdown.amount
        ?? meta.payout_amount ?? meta.amount,
  )
  const payoutUsd = numericValue(
    record?.amount_usd ?? withdrawalBreakdown.payout_amount_usd ?? withdrawalBreakdown.amount_usd
      ?? meta.payout_amount_usd ?? meta.amount_usd
      ?? metaWithdrawalBreakdown.payout_amount_usd ?? metaWithdrawalBreakdown.amount_usd,
  )
  const feeValue = numericValue(
    record?.fee ?? record?.withdrawal_fee ?? withdrawalBreakdown.fee
      ?? withdrawalBreakdown.withdrawal_fee ?? meta.fee ?? meta.withdrawal_fee,
  )
  const feeUsd = numericValue(
    record?.fee_usd ?? record?.withdrawal_fee_usd ?? withdrawalBreakdown.fee_usd
      ?? withdrawalBreakdown.withdrawal_fee_usd ?? meta.fee_usd ?? meta.withdrawal_fee_usd,
  )
  const totalDebitValue = numericValue(
    record?.total_debit ?? withdrawalBreakdown.total_debit ?? meta.total_debit
      ?? (kind === "wallet" ? record?.amount : null),
  )
  const totalDebitUsd = numericValue(
    record?.total_debit_usd ?? withdrawalBreakdown.total_debit_usd ?? meta.total_debit_usd,
  )
  const formatWithdrawalAmount = (value: number | null, usdEquivalent: number | null) => {
    if (value === null) return usdEquivalent === null ? "Not recorded" : recordedMoney(usdEquivalent, "USD")
    return recordedMoney(value, currency, usdEquivalent)
  }
  const relatedInvestmentId = validRelatedId(record?.investment_id, meta.investment_id)
  const relatedTradeId = validRelatedId(record?.trade_id, meta.trade_id)

  async function copyFinancialReferenceFromRecord() {
    try {
      const copiedTarget = await copyFinancialReference(
        record,
        async value => {
          if (!navigator.clipboard?.writeText) throw new Error("Clipboard is unavailable.")
          await navigator.clipboard.writeText(value)
        },
        ["id", "transaction_id"],
        ["transaction_id", "reference", "transaction_reference", "deposit_reference", "withdraw_id"],
      )
      setCopiedRecordId(copiedTarget.value)
      notify.success(
        copiedTarget.kind === "id" ? `${recordIdLabel} copied` : "Reference copied",
        "Ready to paste into your support request.",
      )
    } catch {
      setCopiedRecordId("")
      notify.error("Could not copy the financial reference", "Select and copy the value instead.")
    }
  }

  const details = kind === "deposit"
    ? [
        ["Record ID", canonicalRecordId || "Not recorded"],
        ["Reference", reference],
        ["Status", status],
        ["Amount", `${amount}${currency ? ` ${currency}` : ""}`],
        ["Payment method", paymentMethod],
        ["Submitted", formatDate(record?.created_at)],
        ["Reviewed", formatDate(record?.reviewed_at)],
        ["Review note", text(record?.note)],
      ]
    : isWithdrawalTransaction
      ? [
        ["Record ID", canonicalRecordId || "Not recorded"],
        ["Reference", reference],
        ["Status", status],
        ["Payment method", paymentMethod],
        ["Currency", currency || "Not recorded"],
        ["Requested bank payout", formatWithdrawalAmount(payoutValue, payoutUsd)],
        ["Withdrawal fee", formatWithdrawalAmount(feeValue, feeUsd)],
        ["Total wallet debit", formatWithdrawalAmount(totalDebitValue, totalDebitUsd)],
        ["Saved exchange rate", exchangeRateLabel],
        ["Estimated processing time", text(record?.estimated_processing_time)],
        ["Submitted", formatDate(record?.created_at)],
        ["Reviewed", formatDate(record?.reviewed_at)],
        ["Review note", text(record?.note)],
      ]
      : [
        ["Transaction ID", canonicalRecordId || "Not recorded"],
        ["Type", text(record?.type ?? record?.transaction_type)],
        ["Status", status],
        ["Amount", `${amount}${currency ? ` ${currency}` : ""}`],
        ["Date / time", formatDate(record?.created_at ?? record?.occurred_at ?? record?.date)],
        ["Reference", reference],
        ["Payment method", paymentMethod],
        ["Investment ID", text(record?.investment_id ?? meta.investment_id)],
        ["Trade ID", text(record?.trade_id ?? meta.trade_id ?? meta.trade_reference)],
        ["Description", text(record?.description ?? record?.title)],
      ]

  return (
    <InvestPortalLayout title={title} subtitle="Status and amounts reported by OG Exports">
      <div className="max-w-3xl mx-auto space-y-5">
        <Button variant="outline" size="sm" asChild>
          <Link href={backHref}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to {backLabel}
          </Link>
        </Button>

        {loading && (
          <Card className="glass-card">
            <CardContent className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading transaction…
            </CardContent>
          </Card>
        )}

        {!loading && (error || !record) && (
          <Card className="glass-card">
            <CardContent className="py-12 text-center">
              <ReceiptText className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Transaction not found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This record could not be loaded for your account.
              </p>
            </CardContent>
          </Card>
        )}

        {!loading && record && (
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base font-heading">{title}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{status}</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  data-testid="transaction-detail-receipt"
                  onClick={() => downloadTransactionReceipt(createTransactionReceipt(
                    isWithdrawalTransaction ? "withdrawal" : kind === "wallet" ? "transaction" : kind ?? "transaction",
                    record,
                  ))}
                >
                  Download receipt
                </Button>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/60">
              {details.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-5 py-3 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="inline-flex max-w-[75%] flex-wrap items-center justify-end gap-2 text-right font-medium break-words">
                    <span>{value}</span>
                    {copyTarget && (
                      (copyTarget.kind === "id" && label === recordIdLabel)
                      || (copyTarget.kind === "reference" && label === "Reference")
                    ) && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-1.5 px-2"
                        data-testid="transaction-copy-reference"
                        aria-label={copiedRecordId === copyTarget.value
                          ? copyTarget.kind === "id" ? `${recordIdLabel} copied` : "Financial reference copied"
                          : copyTarget.kind === "id" ? `Copy ${recordIdLabel.toLowerCase()}` : "Copy financial reference"}
                        title={copiedRecordId === copyTarget.value
                          ? copyTarget.kind === "id" ? `${recordIdLabel} copied` : "Financial reference copied"
                          : copyTarget.kind === "id" ? `Copy ${recordIdLabel.toLowerCase()}` : "Copy financial reference"}
                        aria-live="polite"
                        onClick={() => void copyFinancialReferenceFromRecord()}
                      >
                        {copiedRecordId === copyTarget.value
                          ? <Check className="h-3.5 w-3.5" aria-hidden="true" />
                          : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
                        <span>{copiedRecordId === copyTarget.value ? "Copied" : copyTarget.kind === "id" ? "Copy ID" : "Copy reference"}</span>
                      </Button>
                    )}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {!loading && record && (relatedInvestmentId || relatedTradeId) && (
          <div className="flex flex-wrap gap-2" aria-label="Related records">
            {relatedInvestmentId && (
              <Button asChild size="sm" variant="outline" data-testid="transaction-related-investment">
                <Link href={`/invest/positions/${encodeURIComponent(relatedInvestmentId)}`}>
                  View investment {relatedInvestmentId}
                </Link>
              </Button>
            )}
            {relatedTradeId && (
              <Button asChild size="sm" variant="outline" data-testid="transaction-related-trade">
                <Link href={`/invest/${encodeURIComponent(relatedTradeId)}`}>
                  View trade {relatedTradeId}
                </Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </InvestPortalLayout>
  )
}
