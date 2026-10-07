import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import { paymentStatusBadgeClass, paymentStatusLabel } from "@/lib/deposit-statuses"
import { downloadTransactionReceipt, type TransactionReceipt } from "@/lib/transaction-receipt"
import { notify } from "@/lib/notify"
import { Link } from "wouter"

export type TransactionHistoryItem = {
  id: string
  primary: string
  reference?: string
  paymentReference?: string
  date?: string
  status: string
  statusLabel?: string
  receipt?: TransactionReceipt
  detailHref?: string
  breakdown?: {
    payout: string
    fee: string
    totalDebit: string
  }
}

type Props = {
  title: string
  loading?: boolean
  emptyMessage: string
  items: TransactionHistoryItem[]
}

export function TransactionHistoryCard({ title, loading, emptyMessage, items }: Props) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const sortedItems = [...items].sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime()
    const bTime = new Date(b.date || 0).getTime()
    return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
  })

  async function handleDownload(item: TransactionHistoryItem) {
    if (!item.receipt) return
    setDownloadingId(item.id)
    try {
      downloadTransactionReceipt(item.receipt)
    } catch {
      notify.error("Could not download the transaction receipt. Please try again.")
    } finally {
      setDownloadingId(null)
    }
  }

  function detailLine(item: TransactionHistoryItem) {
    const paymentReference = item.paymentReference && item.paymentReference !== item.reference
      ? `Payment reference: ${item.paymentReference}`
      : undefined
    const parts = [item.date, item.reference, paymentReference, `ID: ${item.id}`].filter(Boolean)
    return parts.join(" · ")
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
          </div>
        )}
        {!loading && sortedItems.length === 0 && (
          <p className="text-xs text-muted-foreground">{emptyMessage}</p>
        )}
        {!loading && sortedItems.map(item => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 py-2 border-b border-border/50 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{item.primary}</p>
              <p className="text-[11px] text-muted-foreground truncate">{detailLine(item)}</p>
              {item.breakdown && (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px] leading-4 text-muted-foreground">
                  <dt>Payout</dt>
                  <dd className="text-right">{item.breakdown.payout}</dd>
                  <dt>Fee</dt>
                  <dd className="text-right">{item.breakdown.fee}</dd>
                  <dt>Total debit</dt>
                  <dd className="text-right font-medium text-foreground">{item.breakdown.totalDebit}</dd>
                </dl>
              )}
              {item.detailHref && (
                <Link
                  href={item.detailHref}
                  data-testid={`transaction-details-${item.id}`}
                  className="mt-1 inline-flex text-xs font-semibold text-primary hover:underline"
                >
                  View transaction details
                </Link>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge className={`border-0 text-[10px] ${paymentStatusBadgeClass(item.status)}`}>
                {item.statusLabel || paymentStatusLabel(item.status)}
              </Badge>
              {item.receipt && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={downloadingId === item.id}
                  onClick={() => handleDownload(item)}
                  title="Download receipt file"
                  aria-label={`Download receipt for ${item.reference || item.id}`}
                  data-testid={`transaction-receipt-${item.id}`}
                >
                  {downloadingId === item.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : <Download className="w-3.5 h-3.5" />
                  }
                </Button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
