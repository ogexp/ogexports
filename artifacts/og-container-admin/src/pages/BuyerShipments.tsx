import { useEffect, useMemo, useState } from "react"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Ship, MapPin, CheckCircle2, Clock, Search, ChevronDown, ChevronUp,
  FileText, Download, Truck, Waves, Eye,
} from "lucide-react"
import { api, downloadAuthenticatedFile, openAuthenticatedFile, unwrapPage } from "@/lib/api"
import {
  mapBuyerTradeDocument,
  notifyTradeDocumentDownloadError,
  notifyTradeDocumentViewError,
  type BuyerTradeDocView,
} from "@/lib/buyerTradeDocuments"
import { notify } from "@/lib/notify"

type TimelineStep = { step: string; date: string; done: boolean; active: boolean }

type BuyerDoc = BuyerTradeDocView

type BuyerShipmentView = {
  id: string
  orderId: string
  container: string
  booking: string
  shippingLine: string
  vessel: string
  origin: string
  destination: string
  etd: string
  eta: string
  statusLabel: "Loading" | "In Transit" | "Delivered" | "Pending" | "Arrived"
  statusRaw: string
  pct: number
  product: string
  documents: BuyerDoc[]
  timeline: TimelineStep[]
}

/** Full journey labels always shown on the buyer shipment timeline. */
const TIMELINE_STEPS = [
  "Awaiting Booking",
  "Booking Confirmed",
  "Gate-In at Port",
  "Vessel Loaded",
  "Departed Origin",
  "In Transit",
  "Arrived Destination",
  "Customs Cleared",
  "Final Delivery",
]

/** Canonical order used only to score progress when DB milestones exist. */
const MILESTONE_ORDER = [
  "awaiting booking",
  "booking confirmed",
  "gate-in at port",
  "vessel loaded",
  "departed origin",
  "in transit",
  "arrived destination",
  "customs cleared",
  "final delivery",
  "delivered",
]

/** Fallback active index into TIMELINE_STEPS for each coarse status. */
const STATUS_ACTIVE_INDEX: Record<string, number> = {
  pending: 0,
  booking: 1,
  "in-transit": 5,
  transit: 5,
  arrived: 6,
  delivered: 8,
}

const STATUS_META: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
  "In Transit": { cls: "bg-primary/15 text-primary", icon: Ship, label: "In Transit" },
  Loading: { cls: "bg-amber-500/15 text-amber-600", icon: Truck, label: "Loading" },
  Pending: { cls: "bg-amber-500/15 text-amber-600", icon: Clock, label: "Pending" },
  Arrived: { cls: "bg-violet-500/15 text-violet-600", icon: Waves, label: "Arrived" },
  Delivered: { cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2, label: "Delivered" },
}

function fmtDate(value?: string | null): string {
  if (!value) return "—"
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function normalizeStatus(raw: string): string {
  return String(raw || "pending").toLowerCase().replace("_", "-")
}

function toStatusLabel(raw: string): BuyerShipmentView["statusLabel"] {
  const s = normalizeStatus(raw)
  if (s === "delivered") return "Delivered"
  if (s === "arrived") return "Arrived"
  if (s === "in-transit" || s === "transit") return "In Transit"
  if (s === "booking") return "Loading"
  return "Pending"
}

function statusProgressPct(raw: string): number {
  const s = normalizeStatus(raw)
  if (s === "delivered") return 100
  if (s === "arrived") return 85
  if (s === "in-transit" || s === "transit") return 65
  if (s === "booking") return 25
  return 5
}

function milestoneRank(label: string): number {
  const key = label.toLowerCase().trim()
  const exact = MILESTONE_ORDER.indexOf(key)
  if (exact >= 0) return exact
  const fuzzy = MILESTONE_ORDER.findIndex(o => key.includes(o) || o.includes(key))
  return fuzzy >= 0 ? fuzzy : -1
}

function progressFromMilestones(currentMilestone: string | null | undefined, statusRaw: string, count: number): number {
  if (normalizeStatus(statusRaw) === "delivered") return 100
  if (currentMilestone) {
    const rank = milestoneRank(currentMilestone)
    if (rank >= 0) {
      return Math.min(95, Math.round(((rank + 1) / MILESTONE_ORDER.length) * 100))
    }
  }
  if (count > 0) {
    return Math.min(90, Math.round((count / Math.max(count + 1, 4)) * 100))
  }
  return statusProgressPct(statusRaw)
}

/** Always render the full journey; mark done/active from current_milestone + DB dates. */
function buildTimeline(
  rawStatus: string,
  milestones: any[],
  currentMilestone?: string | null,
): TimelineStep[] {
  const status = normalizeStatus(rawStatus)
  const dateByLabel = new Map<string, string>()

  for (const m of milestones || []) {
    const label = String(m?.label || "").trim()
    if (!label) continue
    const key = label.toLowerCase()
    if (dateByLabel.has(key)) continue
    dateByLabel.set(key, m.occurred_at ? fmtDate(m.occurred_at) : "—")
  }

  const current = (currentMilestone || "").trim()
  let activeIdx = current
    ? TIMELINE_STEPS.findIndex(s => s.toLowerCase() === current.toLowerCase())
    : -1
  if (activeIdx < 0) {
    activeIdx = STATUS_ACTIVE_INDEX[status] ?? 0
  }

  if (status === "delivered") {
    return TIMELINE_STEPS.map(step => ({
      step,
      date: dateByLabel.get(step.toLowerCase()) || "—",
      done: true,
      active: false,
    }))
  }

  return TIMELINE_STEPS.map((step, i) => {
    const active = i === activeIdx
    const done = i < activeIdx
    const logged = dateByLabel.get(step.toLowerCase())
    let date = "—"
    if (logged && logged !== "—") date = logged
    else if (active) date = "In progress"
    return { step, date, done, active }
  })
}

function mapShipment(s: any): BuyerShipmentView {
  const statusRaw = String(s.status || "pending")
  const docs = Array.isArray(s.trade_documents)
    ? s.trade_documents
    : Array.isArray(s.tradeDocuments)
      ? s.tradeDocuments
      : []
  const milestones = Array.isArray(s.milestones) ? s.milestones : []
  const currentMilestone = s.current_milestone || null

  return {
    id: String(s.id),
    orderId: s.order?.order_number || (s.order_id != null ? String(s.order_id) : "—"),
    container: s.container || "—",
    booking: currentMilestone || "—",
    shippingLine: s.shipping_line || "—",
    vessel: s.vessel || "—",
    origin: s.origin || "—",
    destination: s.destination || "—",
    etd: fmtDate(s.etd),
    eta: fmtDate(s.eta),
    statusLabel: toStatusLabel(statusRaw),
    statusRaw,
    pct: progressFromMilestones(currentMilestone, statusRaw, milestones.length),
    product: s.product_snapshot || s.order?.product_snapshot || "Shipment",
    documents: docs.map((d: any) => mapBuyerTradeDocument(d)),
    timeline: buildTimeline(statusRaw, milestones, currentMilestone),
  }
}

export default function BuyerShipments() {
  const [shipments, setShipments] = useState<BuyerShipmentView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [downloadingId, setDownloadingId] = useState<number | null>(null)
  const [viewingId, setViewingId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError("")
      try {
        const res = await api.get("/api/buyer/shipments", { per_page: 100 })
        if (cancelled) return
        const mapped = unwrapPage(res).data.map(mapShipment)
        setShipments(mapped)
        if (mapped.length > 0) setExpanded(String(mapped[0].id))
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load shipments")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  const filtered = useMemo(() => shipments.filter(s =>
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.container.toLowerCase().includes(search.toLowerCase()) ||
    s.product.toLowerCase().includes(search.toLowerCase()) ||
    s.orderId.toLowerCase().includes(search.toLowerCase())
  ), [shipments, search])

  const kpis = useMemo(() => {
    const active = shipments.filter(s => s.statusLabel !== "Delivered").length
    const loadingCount = shipments.filter(s => s.statusLabel === "Loading" || s.statusLabel === "Pending").length
    const inTransit = shipments.filter(s => s.statusLabel === "In Transit").length
    const delivered = shipments.filter(s => s.statusLabel === "Delivered").length
    return [
      { label: "Active Shipments", value: String(active), icon: Ship, cls: "text-primary bg-primary/10" },
      { label: "Loading", value: String(loadingCount), icon: Truck, cls: "text-amber-500 bg-amber-500/15" },
      { label: "In Transit", value: String(inTransit), icon: Waves, cls: "text-blue-500 bg-blue-500/15" },
      { label: "Delivered", value: String(delivered), icon: CheckCircle2, cls: "text-emerald-500 bg-emerald-500/15" },
    ]
  }, [shipments])

  const handleDownload = async (doc: BuyerDoc) => {
    if (doc.status === "pending") {
      notify.error("Document is not available yet")
      return
    }
    setDownloadingId(doc.id)
    try {
      await downloadAuthenticatedFile(
        doc.downloadUrl || `/api/buyer/documents/${doc.id}/download`,
        doc.title || doc.type,
      )
    } catch (e) {
      notifyTradeDocumentDownloadError(e)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleView = async (doc: BuyerDoc) => {
    if (doc.status === "pending") {
      notify.error("Document is not available yet")
      return
    }
    setViewingId(doc.id)
    try {
      await openAuthenticatedFile(
        doc.viewUrl || `/api/buyer/documents/${doc.id}/view`,
        doc.title || doc.type,
      )
    } catch (e) {
      notifyTradeDocumentViewError(e)
    } finally {
      setViewingId(null)
    }
  }

  return (
    <BuyerPortalLayout title="Shipment Updates" subtitle="Shipment milestones recorded for your active and historical orders">
      <div className="space-y-6">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {kpis.map(s => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.cls.split(" ")[1]}`}>
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

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by container, product..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {loading && (
          <p className="text-sm text-muted-foreground py-8 text-center">Loading shipments…</p>
        )}
        {error && !loading && (
          <p className="text-sm text-red-600 py-8 text-center">{error}</p>
        )}
        {!loading && !error && filtered.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No shipments found.</p>
        )}

        <div className="space-y-4">
          {filtered.map(s => {
            const meta = STATUS_META[s.statusLabel] ?? STATUS_META["In Transit"]
            const isOpen = expanded === s.id

            return (
              <Card key={s.id} className={`glass-card transition-all ${s.statusLabel === "Delivered" ? "border-emerald-500/15" : "hover:border-accent/30"}`}>
                <CardContent className="p-0">
                  <button className="w-full text-left p-5" onClick={() => setExpanded(isOpen ? null : s.id)}>
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">#{s.id}</span>
                          <span className="text-xs font-mono text-muted-foreground">{s.orderId}</span>
                          <Badge className={`text-[10px] border-0 ${meta.cls}`}>
                            <meta.icon className="w-3 h-3 mr-1" />{meta.label}
                          </Badge>
                        </div>
                        <p className="text-sm font-bold">{s.product}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 font-mono">{s.container}</p>
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{s.origin} → {s.destination}</span>
                          <span className="flex items-center gap-1"><Ship className="w-3 h-3" />{s.shippingLine} · {s.vessel}</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground shrink-0">ETD {s.etd}</span>
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${s.pct}%` }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">ETA {s.eta}</span>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 shrink-0">
                        {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground mt-1" /> : <ChevronDown className="w-4 h-4 text-muted-foreground mt-1" />}
                      </div>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-border px-5 pb-5 pt-4 space-y-5">
                      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                          { label: "Container No.", value: s.container },
                          { label: "Order Ref.", value: s.orderId },
                          { label: "Shipping Line", value: s.shippingLine },
                          { label: "Vessel", value: s.vessel },
                          { label: "Origin Port", value: s.origin },
                          { label: "Destination Port", value: s.destination },
                          { label: "ETD", value: s.etd },
                          { label: "ETA", value: s.eta },
                        ].map(field => (
                          <div key={field.label} className="p-3 rounded-xl bg-muted/30">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1">{field.label}</p>
                            <p className="text-xs font-semibold">{field.value}</p>
                          </div>
                        ))}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Shipment Timeline</p>
                        {s.timeline.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No tracking updates yet. Details appear here when the trade desk updates this shipment.</p>
                        ) : (
                          <div className="relative">
                            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-border" />
                            <div className="space-y-3">
                              {s.timeline.map((t, i) => (
                                <div key={`${t.step}-${i}`} className="flex items-center gap-4 pl-10 relative">
                                  <div className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 ${t.done ? "bg-emerald-500 border-emerald-500" : t.active ? "bg-accent border-accent" : "bg-background border-border"}`}>
                                    {t.done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : t.active ? <Clock className="w-3.5 h-3.5 text-white" /> : <div className="w-2 h-2 rounded-full bg-border" />}
                                  </div>
                                  <p className={`text-sm flex-1 ${t.active ? "text-accent font-semibold" : t.done ? "text-foreground" : "text-muted-foreground"}`}>
                                    {t.step}
                                    {t.active && <span className="ml-2 text-[10px] uppercase tracking-wide opacity-80">(Active)</span>}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{t.date}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Shipping Documents</p>
                        {s.documents.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No documents available for this shipment yet.</p>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            {s.documents.map(doc => {
                              const unavailable = doc.status === "pending"
                              const busyView = viewingId === doc.id
                              const busyDl = downloadingId === doc.id
                              return (
                                <div
                                  key={doc.id}
                                  className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border border-border text-xs"
                                >
                                  <FileText className="w-3 h-3 shrink-0" />
                                  <span className="max-w-[140px] truncate">{doc.title || doc.type}</span>
                                  <button
                                    type="button"
                                    disabled={unavailable || busyView}
                                    onClick={() => handleView(doc)}
                                    className="p-1 rounded hover:bg-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={unavailable ? "Not available yet" : "View"}
                                  >
                                    <Eye className="w-3 h-3 text-muted-foreground" />
                                  </button>
                                  <button
                                    type="button"
                                    disabled={unavailable || busyDl}
                                    onClick={() => handleDownload(doc)}
                                    className="p-1 rounded hover:bg-muted hover:text-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={unavailable ? "Not available yet" : "Download"}
                                  >
                                    <Download className="w-3 h-3 text-muted-foreground" />
                                  </button>
                                </div>
                              )
                            })}
                          </div>
                        )}
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
