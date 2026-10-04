import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

const EMERALD = "#0F3D2E"

const PAYMENT_STATUS_STYLE: Record<string, { bg: string; color: string; label: string }> = {
  unpaid: { bg: "#fffbeb", color: "#f59e0b", label: "Unpaid" },
  pending_verification: { bg: "#eff6ff", color: "#3b82f6", label: "Pending Verification" },
  paid: { bg: "#f0fdf4", color: "#16a34a", label: "Paid" },
  partial: { bg: "#f5f3ff", color: "#8b5cf6", label: "Partial" },
}

export type PaymentDetailsInfo = {
  orderLabel: string
  buyer: string
  paymentMethod?: string
  paymentStatus?: string
  paymentNotes?: string
}

function statusMeta(status?: string) {
  if (!status) return { bg: "#f8fafc", color: "#64748b", label: "—" }
  const key = status.toLowerCase()
  return PAYMENT_STATUS_STYLE[key] || { bg: "#f8fafc", color: "#64748b", label: status }
}

export function PaymentDetailsDialog({
  open,
  onOpenChange,
  info,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  info: PaymentDetailsInfo | null
}) {
  const st = statusMeta(info?.paymentStatus)
  const hasDetails = Boolean(
    info?.paymentMethod ||
    info?.paymentStatus ||
    (info?.paymentNotes && info.paymentNotes.trim()),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle style={{ color: EMERALD }}>Payment Details</DialogTitle>
          <DialogDescription>
            Buyer-submitted payment method and details for this order.
          </DialogDescription>
        </DialogHeader>

        {info ? (
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-3 py-1 border-b border-border/50">
              <span className="text-muted-foreground text-[12px]">Order</span>
              <span className="font-mono font-semibold text-[12px]" style={{ color: EMERALD }}>{info.orderLabel}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1 border-b border-border/50">
              <span className="text-muted-foreground text-[12px]">Buyer</span>
              <span className="font-medium text-[12px] text-right">{info.buyer}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1 border-b border-border/50">
              <span className="text-muted-foreground text-[12px]">Payment Method</span>
              <span className="font-medium text-[12px] text-right">{info.paymentMethod || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1 border-b border-border/50">
              <span className="text-muted-foreground text-[12px]">Payment Status</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>
                {st.label}
              </span>
            </div>
            <div className="pt-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Buyer Details
              </p>
              {hasDetails && info.paymentNotes?.trim() ? (
                <pre className="whitespace-pre-wrap text-[12px] bg-muted/40 border border-border rounded-lg p-3 font-sans leading-relaxed">
                  {info.paymentNotes}
                </pre>
              ) : (
                <p className="text-[12px] text-muted-foreground">
                  No payment details submitted yet. Buyer can submit from /buyer/payments.
                </p>
              )}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
