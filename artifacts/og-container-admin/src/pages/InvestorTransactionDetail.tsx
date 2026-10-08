import { useEffect, useState } from "react"
import { Link, useParams } from "wouter"
import { ArrowLeft, Loader2, ReceiptText } from "lucide-react"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api, unwrapList } from "@/lib/api"
import { createTransactionReceipt, downloadTransactionReceipt } from "@/lib/transaction-receipt"

type TransactionKind = "deposit" | "withdrawal" | "wallet"
type TransactionRecord = Record<string, unknown>

async function fetchInvestorTransactionRecord(
  kind: TransactionKind | null,
  id: string,
  page: number,
  perPage: number,
): Promise<TransactionRecord | null> {
  if (!kind || !id) return null
  if (kind === "wallet") {
    const response = await api.get<unknown>("/api/investor/wallet/transactions", {
      page,
      per_page: perPage,
    })
    return unwrapList<TransactionRecord>(response)
      .find(item => String(item.id ?? item.transaction_id ?? "") === id) ?? null
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
  const requestedPage = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("page")
  const requestedPerPage = typeof window === "undefined"
    ? null
    : new URLSearchParams(window.location.search).get("per_page")
  const parsedPage = Number(requestedPage)
  const parsedPerPage = Number(requestedPerPage)
  const sourcePage = Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1
  const sourcePerPage = Number.isInteger(parsedPerPage) && parsedPerPage > 0 && parsedPerPage <= 100
    ? parsedPerPage
    : 100
  const [record, setRecord] = useState<TransactionRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
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
        const response = await fetchInvestorTransactionRecord(kind, id, sourcePage, sourcePerPage)
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
  }, [kind, id, sourcePage, sourcePerPage])

  useEffect(() => {
    let cancelled = false
    const refresh = () => {
      if (!kind || !id) return
      setError(false)
      void fetchInvestorTransactionRecord(kind, id, sourcePage, sourcePerPage)
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
  }, [kind, id, sourcePage, sourcePerPage])

  const status = text(record?.review_status ?? record?.status)
  const reference = text(record?.reference ?? record?.transaction_reference ?? record?.withdraw_id)
  const amount = text(record?.amount)
  const currency = text(record?.currency ?? record?.amount_currency, "")
  const meta = record?.meta && typeof record.meta === "object" ? record.meta as TransactionRecord : {}
  const details = kind === "deposit"
    ? [
        ["Record ID", text(record?.id, id)],
        ["Reference", reference],
        ["Status", status],
        ["Amount", `${amount}${currency ? ` ${currency}` : ""}`],
        ["Payment method", text(record?.method ?? record?.payment_method)],
        ["Submitted", formatDate(record?.created_at)],
        ["Reviewed", formatDate(record?.reviewed_at)],
        ["Review note", text(record?.note)],
      ]
    : kind === "withdrawal"
      ? [
        ["Record ID", text(record?.id, id)],
        ["Reference", reference],
        ["Status", status],
        ["Requested bank payout", `${amount}${currency ? ` ${currency}` : ""}`],
        ["Withdrawal fee", text(record?.fee ?? record?.withdrawal_fee)],
        ["Total wallet debit", text(record?.total_debit)],
        ["Estimated processing time", text(record?.estimated_processing_time)],
        ["Submitted", formatDate(record?.created_at)],
        ["Reviewed", formatDate(record?.reviewed_at)],
        ["Review note", text(record?.note)],
      ]
      : [
        ["Transaction ID", text(record?.id ?? record?.transaction_id, id)],
        ["Type", text(record?.type ?? record?.transaction_type)],
        ["Status", status],
        ["Amount", `${amount}${currency ? ` ${currency}` : ""}`],
        ["Date / time", formatDate(record?.created_at ?? record?.occurred_at ?? record?.date)],
        ["Reference", reference],
        ["Payment method", text(record?.payment_method ?? record?.method ?? meta.payment_method ?? meta.method)],
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
                  onClick={() => downloadTransactionReceipt(createTransactionReceipt(kind === "wallet" ? "transaction" : kind ?? "transaction", record))}
                >
                  Download receipt
                </Button>
              </div>
            </CardHeader>
            <CardContent className="divide-y divide-border/60">
              {details.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-5 py-3 text-sm">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="max-w-[65%] text-right font-medium break-words">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </InvestPortalLayout>
  )
}
