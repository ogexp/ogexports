import { Badge } from "@/components/ui/badge"

export function RfqStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    new: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    quoted: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    accepted: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    declined: "bg-red-500/10 text-red-500 border-red-500/20",
    closed: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  }
  return <Badge variant="outline" className={variants[status] || variants.closed}>{status.replace('_', ' ')}</Badge>
}

export function OrderStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_production: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    shipped: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    delivered: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  }
  return <Badge variant="outline" className={variants[status] || variants.pending}>{status.replace('_', ' ')}</Badge>
}

export function InvoiceStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    unpaid: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    paid: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    overdue: "bg-red-500/10 text-red-500 border-red-500/20",
  }
  return <Badge variant="outline" className={variants[status] || variants.unpaid}>{status.replace('_', ' ')}</Badge>
}

export function ShipmentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    booked: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_transit: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    customs: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    delivered: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  }
  return <Badge variant="outline" className={variants[status] || variants.booked}>{status.replace('_', ' ')}</Badge>
}

export function ContractStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    draft: "bg-slate-500/10 text-slate-500 border-slate-500/20",
    sent: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    signed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  }
  return <Badge variant="outline" className={variants[status] || variants.draft}>{status.replace('_', ' ')}</Badge>
}

export function ContainerStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    funding: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    funded: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    in_transit: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    customs: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    delivered: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  }
  return <Badge variant="outline" className={variants[status] || variants.funding}>{status.replace('_', ' ')}</Badge>
}

export function InvestmentStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    active: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    completed: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  }
  return <Badge variant="outline" className={variants[status] || variants.active}>{status}</Badge>
}

export function SupportTicketStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    open: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    in_progress: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    resolved: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    closed: "bg-slate-500/10 text-slate-500 border-slate-500/20",
  }
  return <Badge variant="outline" className={variants[status] || variants.open}>{status.replace('_', ' ')}</Badge>
}
