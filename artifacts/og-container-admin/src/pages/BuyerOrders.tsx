import { useMemo, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api, unwrapPage } from "@/lib/api"
import {
  ORDER_STATUS_CODES,
  ORDER_STATUS_LABELS,
  buildOrderTimeline,
  normalizeOrderStatus,
  orderStatusLabel,
  type OrderStatusCode,
} from "@/lib/order-statuses"
import {
  ShoppingCart, CheckCircle2, Clock, Ship, PackageCheck, XCircle,
  Search, Download, ChevronDown, ChevronUp, Package, MapPin, Calendar,
  FileText, DollarSign, RefreshCw, CreditCard, ClipboardCheck, Anchor, Eye, Loader2,
} from "lucide-react"
import { downloadAuthenticatedFile, openAuthenticatedFile } from "@/lib/api"
import {
  mapBuyerTradeDocument,
  notifyTradeDocumentDownloadError,
  notifyTradeDocumentViewError,
  type BuyerTradeDocView,
} from "@/lib/buyerTradeDocuments"
import { notify } from "@/lib/notify"

interface OrderView {
  dbId: number
  id: string
  date: string
  product: string
  qty: string
  value: string
  valueNum: number
  destination: string
  incoterm: string
  paymentTerms: string
  status: OrderStatusCode
  statusLabel: string
  timeline: { step: string; date: string; done: boolean; active: boolean }[]
  trackingRef?: string
  isNew?: boolean
}

type TradeDocView = BuyerTradeDocView

const STATUS_META: Record<OrderStatusCode, { cls: string; icon: React.ElementType; bar: string }> = {
  order_confirmed:     { cls: "bg-blue-500/15 text-blue-600",       icon: CheckCircle2,   bar: "bg-blue-400" },
  payment:             { cls: "bg-violet-500/15 text-violet-600",   icon: CreditCard,     bar: "bg-violet-400" },
  production:          { cls: "bg-amber-500/15 text-amber-600",     icon: Clock,          bar: "bg-amber-400" },
  quality_inspection:  { cls: "bg-sky-500/15 text-sky-600",         icon: ClipboardCheck, bar: "bg-sky-400" },
  loaded_at_port:      { cls: "bg-indigo-500/15 text-indigo-600",   icon: Anchor,         bar: "bg-indigo-400" },
  in_transit:          { cls: "bg-primary/15 text-primary",         icon: Ship,           bar: "bg-primary" },
  delivered:           { cls: "bg-emerald-500/15 text-emerald-600", icon: PackageCheck,   bar: "bg-emerald-500" },
  cancelled:           { cls: "bg-red-500/15 text-red-500",         icon: XCircle,        bar: "bg-red-400" },
}

type StatusFilter = "all" | OrderStatusCode

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...ORDER_STATUS_CODES.map(code => ({ value: code, label: ORDER_STATUS_LABELS[code] })),
]

function mapApiOrder(row: any): OrderView {
  const items = Array.isArray(row.items) ? row.items : []
  const product = items.map((i: any) => i.product_name || i.product?.name).filter(Boolean).join(", ")
    || row.product_name
    || "Product"
  const qty = items.map((i: any) => {
    const q = i.qty ?? i.quantity
    return q != null ? `${q} MT` : null
  }).filter(Boolean).join(" · ") || "—"

  const valueNum = Number(row.total_value) || 0
  const placed = row.placed_at || row.created_at
  const date = placed
    ? new Date(placed).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
    : "—"
  const status = normalizeOrderStatus(row.status)
  const destination = row.quotation?.destination
    || row.destination
    || "—"
  const incoterm = row.quotation?.incoterm || row.incoterm || "—"
  const paymentTerms = row.quotation?.payment_terms
    || row.payment_method
    || row.payment_status
    || "—"

  const placedMs = placed ? new Date(placed).getTime() : 0
  const isNew = placedMs > 0 && (Date.now() - placedMs) < 7 * 86400000

  return {
    dbId: Number(row.id),
    id: row.order_number || `ORD-${row.id}`,
    date,
    product,
    qty,
    value: `$${valueNum.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
    valueNum,
    destination,
    incoterm,
    paymentTerms: String(paymentTerms),
    status,
    statusLabel: orderStatusLabel(status),
    trackingRef: row.tracking_ref || row.trackingRef || undefined,
    timeline: buildOrderTimeline(status, row.status_timeline, placed),
    isNew,
  }
}

function OrderDocuments({ dbId }: { dbId: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["buyer", "orders", dbId, "documents"],
    queryFn: () => api.get<{ data: { trade_documents?: TradeDocView[]; tradeDocuments?: TradeDocView[] } }>(`/api/buyer/orders/${dbId}`),
  })

  const docs: TradeDocView[] = useMemo(() => {
    const row = data?.data
    const raw = row?.trade_documents || row?.tradeDocuments || []
    return raw.map((d: any) => mapBuyerTradeDocument(d))
  }, [data])

  async function viewDoc(doc: TradeDocView) {
    if (doc.status === "pending") {
      notify.error("Document is not available yet")
      return
    }
    try {
      await openAuthenticatedFile(doc.viewUrl, doc.title)
    } catch (e) {
      notifyTradeDocumentViewError(e)
    }
  }

  async function downloadDoc(doc: TradeDocView) {
    if (doc.status === "pending") {
      notify.error("Document is not available yet")
      return
    }
    try {
      await downloadAuthenticatedFile(doc.downloadUrl, doc.title)
    } catch (e) {
      notifyTradeDocumentDownloadError(e)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading documents…
      </div>
    )
  }

  if (docs.length === 0) {
    return <p className="text-xs text-muted-foreground">No shipment documents attached yet.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {docs.map(doc => {
        const unavailable = doc.status === "pending"
        return (
          <div key={doc.id} className="flex items-center gap-1 rounded-lg border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => void viewDoc(doc)}
              disabled={unavailable}
              title={unavailable ? "Not available yet" : "View"}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileText className="w-3 h-3" /> {doc.title}
            </button>
            <button
              type="button"
              onClick={() => void downloadDoc(doc)}
              disabled={unavailable}
              className="px-2 py-1.5 border-l border-border hover:bg-muted/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={unavailable ? "Not available yet" : "Download"}
            >
              <Download className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function BuyerOrders() {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [pdfLoadingId, setPdfLoadingId] = useState<number | null>(null)
  const [repeatLoadingId, setRepeatLoadingId] = useState<number | null>(null)

  const { data: statsPayload } = useQuery({
    queryKey: ["buyer", "orders", "stats"],
    queryFn: () => api.get("/api/buyer/orders", { per_page: 100 }),
  })

  const { data: ordersPayload, isLoading, isFetching } = useQuery({
    queryKey: ["buyer", "orders", statusFilter, search],
    queryFn: () => api.get("/api/buyer/orders", {
      per_page: 100,
      status: statusFilter === "all" ? undefined : statusFilter,
      search: search.trim() || undefined,
    }),
  })

  const allOrders = useMemo(
    () => unwrapPage<any>(statsPayload).data.map(mapApiOrder),
    [statsPayload],
  )

  const filtered = useMemo(
    () => unwrapPage<any>(ordersPayload).data.map(mapApiOrder),
    [ordersPayload],
  )

  const totalInTransit = allOrders.filter(o => o.status === "in_transit").length
  const totalDelivered = allOrders.filter(o => o.status === "delivered").length
  const totalValueNum = allOrders.reduce((sum, o) => sum + o.valueNum, 0)

  async function exportPdf(o: OrderView) {
    setPdfLoadingId(o.dbId)
    try {
      await downloadAuthenticatedFile(`/api/buyer/orders/${o.dbId}/pdf`, `${o.id}.pdf`)
      notify.success("Order PDF downloaded")
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to download PDF")
    } finally {
      setPdfLoadingId(null)
    }
  }

  async function repeatOrder(o: OrderView) {
    setRepeatLoadingId(o.dbId)
    try {
      await api.post(`/api/buyer/orders/${o.dbId}/repeat`)
      notify.success("Repeat RFQ created — check Request for Quotation")
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Unable to repeat order")
    } finally {
      setRepeatLoadingId(null)
    }
  }

  return (
    <BuyerPortalLayout title="Order Management" subtitle="Track the complete lifecycle of every purchase order">
      <div className="space-y-6">

        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Orders",   value: allOrders.length,  icon: ShoppingCart,  cls: "text-accent bg-accent/15"         },
            { label: "In Transit",     value: totalInTransit,    icon: Ship,          cls: "text-primary bg-primary/10"        },
            { label: "Delivered",      value: totalDelivered,    icon: PackageCheck,  cls: "text-emerald-500 bg-emerald-500/15" },
            { label: "Order Value",    value: `$${totalValueNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: DollarSign, cls: "text-accent bg-accent/15" },
          ].map(s => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.cls.split(" ")[1]}`}>
                  <s.icon className={`w-4 h-4 ${s.cls.split(" ")[0]}`} />
                </div>
                <div>
                  <p className="text-xl font-heading font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search orders..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl flex-wrap w-full sm:w-auto">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${statusFilter === tab.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders */}
        <div className="space-y-4">
          {(isLoading || isFetching) && filtered.length === 0 && (
            <div className="py-16 text-center text-muted-foreground text-sm">Loading orders…</div>
          )}
          {!isLoading && !isFetching && filtered.length === 0 && (
            <div className="py-16 text-center text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {allOrders.length === 0
                  ? "No orders yet. Accept a quotation to create your first order."
                  : statusFilter !== "all" || search.trim()
                    ? `No orders found${statusFilter !== "all" ? ` with status "${ORDER_STATUS_LABELS[statusFilter]}"` : ""}${search.trim() ? ` matching "${search.trim()}"` : ""}.`
                    : "No orders yet. Accept a quotation to create your first order."}
              </p>
            </div>
          )}
          {filtered.map(o => {
            const meta   = STATUS_META[o.status] ?? STATUS_META.order_confirmed
            const isOpen = expanded === o.id
            const done   = o.timeline.filter(t => t.done && !t.active).length
            const total  = o.timeline.length

            return (
              <Card key={o.id} className={`glass-card transition-all ${o.status === "delivered" ? "border-emerald-500/15" : o.status === "cancelled" ? "opacity-70" : "hover:border-accent/30"} ${o.isNew ? "ring-1 ring-violet-500/30 border-violet-500/20" : ""}`}>
                <CardContent className="p-0">
                  <button className="w-full text-left p-5" onClick={() => setExpanded(isOpen ? null : o.id)}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground font-bold">{o.id}</span>
                          <Badge className={`text-[10px] border-0 ${meta.cls}`}>
                            <meta.icon className="w-3 h-3 mr-1" />{o.statusLabel}
                          </Badge>
                          {o.isNew && <Badge className="bg-violet-500/15 text-violet-600 border-0 text-[10px]">New</Badge>}
                          {o.trackingRef && <span className="text-[10px] text-muted-foreground font-mono">{o.trackingRef}</span>}
                        </div>
                        <p className="text-sm font-bold truncate">{o.product}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" />{o.qty}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{o.destination}</span>
                          <span>{o.incoterm}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{o.date}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${meta.bar} transition-all`} style={{ width: `${(done / total) * 100}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{done}/{total} steps</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <p className="text-lg font-heading font-bold text-accent">{o.value}</p>
                          <p className="text-xs text-muted-foreground">{o.paymentTerms}</p>
                        </div>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-5 pb-5 pt-4 space-y-5">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Order Timeline</p>
                        <div className="relative">
                          <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                          <div className="space-y-3">
                            {o.timeline.map((t, i) => (
                              <div key={i} className="flex items-start gap-4 pl-10 relative">
                                <div className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${t.done ? "bg-emerald-500 border-emerald-500" : t.active ? "bg-accent border-accent" : "bg-background border-border"}`}>
                                  {t.done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : t.active ? <Clock className="w-3.5 h-3.5 text-white" /> : <div className="w-2 h-2 rounded-full bg-border" />}
                                </div>
                                <div className="flex-1 flex justify-between min-w-0">
                                  <p className={`text-sm font-medium ${t.active ? "text-accent" : t.done ? "text-foreground" : "text-muted-foreground"}`}>{t.step}</p>
                                  <p className="text-xs text-muted-foreground shrink-0 ml-3">{t.date}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Attached Documents</p>
                        <OrderDocuments dbId={o.dbId} />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={repeatLoadingId === o.dbId}
                          onClick={() => void repeatOrder(o)}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${repeatLoadingId === o.dbId ? "animate-spin" : ""}`} /> Repeat Order
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={pdfLoadingId === o.dbId}
                          onClick={() => void exportPdf(o)}
                        >
                          <Download className="w-3.5 h-3.5 mr-1.5" /> {pdfLoadingId === o.dbId ? "Preparing…" : "Export PDF"}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </BuyerPortalLayout>
  )
}
