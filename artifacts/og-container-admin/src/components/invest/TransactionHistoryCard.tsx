import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Download } from "lucide-react"
import { paymentStatusBadgeClass, paymentStatusLabel } from "@/lib/deposit-statuses"
import { downloadAuthenticatedFile } from "@/lib/api"
import { notify } from "@/lib/notify"

export type TransactionHistoryItem = {
  id: string
  primary: string
  reference?: string
  date?: string
  status: string
  statusLabel?: string
  pdfPath?: string
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
    if (!item.pdfPath) return
    setDownloadingId(item.id)
    try {
      const fallback = item.reference || `transaction-${item.id}`
      await downloadAuthenticatedFile(item.pdfPath, fallback)
    } catch {
      notify.error("Could not download PDF. Please try again.")
    } finally {
      setDownloadingId(null)
    }
  }

  function detailLine(item: TransactionHistoryItem) {
    const parts = [item.date, item.reference, `ID: ${item.id}`].filter(Boolean)
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
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{item.primary}</p>
              <p className="text-[11px] text-muted-foreground truncate">{detailLine(item)}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge className={`border-0 text-[10px] ${paymentStatusBadgeClass(item.status)}`}>
                {item.statusLabel || paymentStatusLabel(item.status)}
              </Badge>
              {item.pdfPath && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  disabled={downloadingId === item.id}
                  onClick={() => handleDownload(item)}
                  title="Download PDF"
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
