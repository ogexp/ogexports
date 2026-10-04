import { Copy, Landmark, UserRound, Wallet } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { AdminWithdrawal } from "@/lib/admin-data"

const EMERALD = "#0F3D2E"

type WithdrawalDetailDialogProps = {
  withdrawal: AdminWithdrawal | null
  onClose: () => void
  onCopy?: (text: string, label: string) => void
}

function CopyableRow({
  label,
  value,
  onCopy,
  mono = true,
}: {
  label: string
  value?: string
  onCopy?: (text: string, label: string) => void
  mono?: boolean
}) {
  if (!value) return null

  return (
    <div className="flex h-full items-start justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={`mt-1 text-sm font-medium break-all ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={() => onCopy(value, label)}
          className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
          title={`Copy ${label}`}
        >
          <Copy className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}

export function WithdrawalDetailDialog({ withdrawal, onClose, onCopy }: WithdrawalDetailDialogProps) {
  const bd = withdrawal?.bankDetails || {}
  const bankName = bd.bank_name || withdrawal?.bank

  return (
    <Dialog open={!!withdrawal} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {withdrawal && (
          <>
            <div className="shrink-0 border-b border-border/80 bg-gradient-to-r from-[#f5f9f6] via-white to-[#fff8ef] px-5 py-4">
              <DialogHeader className="space-y-1 text-left">
                <DialogTitle className="font-heading text-lg">Withdrawal Details</DialogTitle>
                <p className="text-xs text-muted-foreground">Review payout request and investor bank account information.</p>
              </DialogHeader>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-white p-3">
                  <div className="mb-2 flex items-center gap-2 text-muted-foreground">
                    <UserRound className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Investor</span>
                  </div>
                  <p className="text-sm font-bold">{withdrawal.investor}</p>
                </div>
                <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
                  <div className="mb-2 flex items-center gap-2 text-red-700/70">
                    <Wallet className="h-4 w-4" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Amount</span>
                  </div>
                  <p className="text-lg font-bold text-red-600">{withdrawal.amount}</p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Reference</p>
                  <p className="mt-1 font-mono text-sm font-semibold" style={{ color: EMERALD }}>{withdrawal.ref}</p>
                </div>
                <div className="rounded-lg border border-border/60 px-3 py-2">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Requested</p>
                  <p className="mt-1 text-sm font-medium">{withdrawal.requested}</p>
                </div>
              </div>

              <div className="rounded-xl border border-border/80 bg-white p-4">
                <div className="mb-3 flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${EMERALD}15` }}>
                    <Landmark className="h-4 w-4" style={{ color: EMERALD }} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Bank Account Details</h3>
                    <p className="text-[11px] text-muted-foreground">Use copy buttons to paste details into your banking portal.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <CopyableRow label="Bank Name" value={bankName} onCopy={onCopy} mono={false} />
                  <CopyableRow label="Account Title" value={bd.account_holder} onCopy={onCopy} mono={false} />
                  <CopyableRow label="Account No" value={bd.account_number} onCopy={onCopy} />
                  <CopyableRow label="IBAN" value={bd.iban} onCopy={onCopy} />
                  <CopyableRow label="SWIFT / BIC" value={bd.swift} onCopy={onCopy} />
                  <CopyableRow label="Branch" value={bd.branch} onCopy={onCopy} mono={false} />
                  <CopyableRow label="Currency" value={bd.currency} onCopy={onCopy} mono={false} />
                  <CopyableRow label="Purpose" value={bd.purpose} onCopy={onCopy} mono={false} />
                </div>
              </div>

              {withdrawal.note && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <span className="font-semibold">Note:</span> {withdrawal.note}
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
