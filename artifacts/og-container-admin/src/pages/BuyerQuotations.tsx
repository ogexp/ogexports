import { useState, useEffect, useMemo, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  FileText, CheckCircle2, XCircle, Clock, Download, MessageSquare,
  ChevronDown, ChevronUp, Package, MapPin, Calendar,
  AlertCircle, Zap, Ship,
} from "lucide-react"
import { api, unwrapPage, ApiError, downloadAuthenticatedFile } from "@/lib/api"
import { notify } from "@/lib/notify"

type ThreadMessage = { id: number; body: string; user?: { name?: string }; user_id: number; created_at: string }

const GOLD = "#D4A012"

interface QuoteView {
  rawId: number
  rfqRawId: number | null
  orderId: number | null
  id: string
  rfqId: string
  date: string
  product: string
  qty: string
  qtyMT: number
  incoterm: string
  destination: string
  unitPrice: string
  totalValue: string
  validity: string
  paymentTerms: string
  status: "Pending" | "Received" | "Accepted" | "Rejected" | "Expired"
  auto: boolean
  notes: string
  breakdown: { label: string; val: string }[]
  fobUnitPrice: number
  freight: number
  insurance: number
  docFee: number
}

function mapApiQuote(row: any): QuoteView {
  const qtyMT = Number(row.qty_mt) || 0
  const fob = Number(row.fob_unit_price) || 0
  const freight = Number(row.freight) || 0
  const insurance = Number(row.insurance) || 0
  const docFee = Number(row.doc_fee) || 0
  const productTotal = qtyMT * fob
  const total = productTotal + freight + insurance + docFee
  const incoterm = String(row.incoterm || "FOB")

  const breakdown: { label: string; val: string }[] = [
    { label: `Quote Price (${qtyMT} MT × $${fob.toLocaleString()}/MT)`, val: `$${productTotal.toLocaleString()}` },
  ]
  if (incoterm !== "FOB") {
    breakdown.push({ label: `Ocean Freight (${incoterm})`, val: freight ? `$${freight.toLocaleString()}` : "—" })
  }
  if (incoterm === "CIF") {
    breakdown.push({ label: "Marine Insurance (110%)", val: insurance ? `$${insurance.toLocaleString()}` : "—" })
  }
  breakdown.push({ label: "Documentation", val: docFee ? `$${docFee.toLocaleString()}` : "Included" })

  const rawStatus = String(row.status || "pending_admin").toLowerCase()
  let status: QuoteView["status"] = "Pending"
  if (rawStatus === "sent") status = "Received"
  else if (rawStatus === "accepted") status = "Accepted"
  else if (rawStatus === "rejected") status = "Rejected"
  else if (rawStatus === "expired") status = "Expired"
  else if (rawStatus === "pending_admin" || rawStatus === "pending") status = "Pending"

  const issued = row.issued_at || row.created_at
  const rfqRawId = row.rfq_id != null ? Number(row.rfq_id) : null
  const orderId = Array.isArray(row.orders) && row.orders[0]?.id
    ? Number(row.orders[0].id)
    : (row.order_id != null ? Number(row.order_id) : null)

  return {
    rawId: Number(row.id),
    rfqRawId,
    orderId: Number.isFinite(orderId) ? orderId : null,
    id: `QT-${String(row.id).padStart(6, "0")}`,
    rfqId: rfqRawId != null ? `RFQ-${String(rfqRawId).padStart(6, "0")}` : "—",
    date: issued
      ? new Date(issued).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : "—",
    product: row.product_name || row.rfq?.product_name || "Product",
    qty: `${qtyMT} MT`,
    qtyMT,
    incoterm,
    destination: row.destination || "—",
    unitPrice: fob ? `$${fob.toLocaleString()}/MT` : "TBD",
    totalValue: status === "Pending" ? "Pending" : `$${total.toLocaleString()}`,
    validity: row.valid_until
      ? new Date(row.valid_until).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : "—",
    paymentTerms: row.payment_terms || "—",
    status,
    auto: String(row.source || "") === "auto-fob",
    notes: row.notes || "Quotation issued by OG Exports trade desk.",
    breakdown,
    fobUnitPrice: fob,
    freight,
    insurance,
    docFee,
  }
}

const STATUS_META: Record<string, { cls: string; icon: React.ElementType; label: string }> = {
  Pending:  { cls: "bg-amber-500/15 text-amber-600",     icon: Clock,        label: "Awaiting Trade Desk" },
  Received: { cls: "bg-blue-500/15 text-blue-600",       icon: Clock,        label: "Awaiting Decision"   },
  Accepted: { cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2, label: "Accepted"            },
  Rejected: { cls: "bg-red-500/15 text-red-500",         icon: XCircle,      label: "Rejected"            },
  Expired:  { cls: "bg-muted text-muted-foreground",     icon: AlertCircle,  label: "Expired"             },
}

function readRfqFilter(): number | null {
  if (typeof window === "undefined") return null
  const raw = new URLSearchParams(window.location.search).get("rfq")
  if (!raw) return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export default function BuyerQuotations() {
  const queryClient = useQueryClient()
  const negotiateInputRef = useRef<HTMLTextAreaElement>(null)
  const [rfqFilter, setRfqFilter] = useState<number | null>(() => readRfqFilter())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("All")
  const [negotiateMsg, setNegotiateMsg] = useState("")
  const [decidingId, setDecidingId] = useState<number | null>(null)
  const [sendingNegotiate, setSendingNegotiate] = useState(false)
  const [thread, setThread] = useState<ThreadMessage[]>([])
  const [loadingThread, setLoadingThread] = useState(false)

  const { data: quotesPayload, isLoading } = useQuery({
    queryKey: ["buyer", "quotations"],
    queryFn: () => api.get("/api/buyer/quotations", { per_page: 100 }),
  })

  const all = useMemo(
    () => unwrapPage<any>(quotesPayload).data.map(mapApiQuote),
    [quotesPayload],
  )

  const scoped = useMemo(
    () => (rfqFilter != null ? all.filter((q) => q.rfqRawId === rfqFilter) : all),
    [all, rfqFilter],
  )

  useEffect(() => {
    if (rfqFilter == null || scoped.length === 0) return
    setExpanded(scoped[0].id)
  }, [rfqFilter, scoped])

  useEffect(() => {
    if (expanded == null) {
      setThread([])
      setNegotiateMsg("")
      return
    }
    const q = all.find((item) => item.id === expanded)
    if (!q || q.status === "Pending") {
      setThread([])
      setNegotiateMsg("")
      return
    }

    let cancelled = false
    setNegotiateMsg("")
    setLoadingThread(true)
    setThread([])

    void (async () => {
      try {
        const res = await api.get<{ data: ThreadMessage[] }>(`/api/buyer/quotations/${q.rawId}/messages`)
        if (cancelled) return
        setThread(Array.isArray(res?.data) ? res.data : [])
      } catch (error) {
        if (cancelled) return
        setThread([])
        const msg = error instanceof ApiError
          ? (error.status === 419
            ? "Session expired — refresh and sign in again"
            : error.message || "Unable to load trade desk messages")
          : (error instanceof Error ? error.message : "Unable to load trade desk messages")
        notify.error(msg)
      } finally {
        if (!cancelled) setLoadingThread(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [expanded, all])

  const filtered = scoped.filter((q) => activeTab === "All" || q.status === activeTab)
  const totalVal = scoped.reduce((s, q) => {
    const n = parseFloat(q.totalValue.replace(/[$,]/g, ""))
    return s + (isNaN(n) ? 0 : n)
  }, 0)

  function focusNegotiateComposer() {
    negotiateInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    negotiateInputRef.current?.focus()
  }

  async function loadThread(q: QuoteView) {
    setLoadingThread(true)
    setThread([])
    try {
      const res = await api.get<{ data: ThreadMessage[] }>(`/api/buyer/quotations/${q.rawId}/messages`)
      setThread(Array.isArray(res?.data) ? res.data : [])
    } catch (error) {
      setThread([])
      const msg = error instanceof ApiError
        ? (error.status === 419
          ? "Session expired — refresh and sign in again"
          : error.message || "Unable to load trade desk messages")
        : (error instanceof Error ? error.message : "Unable to load trade desk messages")
      notify.error(msg)
    } finally {
      setLoadingThread(false)
    }
  }

  async function sendNegotiate(q: QuoteView) {
    if (!negotiateMsg.trim()) {
      notify.error("Enter a message")
      return
    }
    if (!q.rawId || !Number.isFinite(q.rawId)) {
      notify.error("Invalid quotation — refresh the page and try again")
      return
    }
    setSendingNegotiate(true)
    try {
      await api.post(`/api/buyer/quotations/${q.rawId}/messages`, { body: negotiateMsg.trim() })
      notify.success("Message sent to trade desk")
      setNegotiateMsg("")
      await loadThread(q)
    } catch (error) {
      const msg = error instanceof ApiError
        ? (error.status === 419
          ? "Session expired — refresh and sign in again"
          : (error.message || `Failed to send message (${error.status})`))
        : (error instanceof Error ? error.message : "Failed to send message")
      notify.error(msg)
    } finally {
      setSendingNegotiate(false)
    }
  }

  async function downloadQuotePdf(q: QuoteView) {
    if (!q.orderId) {
      notify.error(q.status === "Accepted"
        ? "Order PDF is not linked yet — open Orders to download"
        : "Accept the quotation first to generate an order PDF")
      return
    }
    try {
      await downloadAuthenticatedFile(`/api/buyer/orders/${q.orderId}/pdf`, `Order-${q.id}.pdf`)
      notify.success("PDF downloaded")
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Failed to download PDF")
    }
  }

  async function decide(q: QuoteView, status: "Accepted" | "Rejected") {
    setDecidingId(q.rawId)
    try {
      const path = status === "Accepted"
        ? `/api/buyer/quotations/${q.rawId}/accept`
        : `/api/buyer/quotations/${q.rawId}/reject`
      await api.post(path)
      await queryClient.invalidateQueries({ queryKey: ["buyer", "quotations"] })
      await queryClient.invalidateQueries({ queryKey: ["buyer", "rfqs"] })
      await queryClient.invalidateQueries({ queryKey: ["buyer", "orders"] })
      notify.success(`Quotation ${q.id} ${status.toLowerCase()}`)
      if (status === "Accepted") {
        notify.success("Order created — view it under Orders")
      }
    } catch (error) {
      notify.error(error instanceof Error ? error.message : `Unable to ${status.toLowerCase()} quotation`)
    } finally {
      setDecidingId(null)
    }
  }

  return (
    <BuyerPortalLayout title="Quotation Management" subtitle="Review, compare, negotiate and manage received quotations">
      <div className="space-y-6">

        {rfqFilter != null && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge className="border-0 text-xs" style={{ background: "rgba(212,160,18,0.15)", color: GOLD }}>
              Filtered by RFQ-{String(rfqFilter).padStart(6, "0")}
            </Badge>
            <button
              type="button"
              className="text-xs text-muted-foreground underline hover:text-foreground"
              onClick={() => {
                setRfqFilter(null)
                window.history.replaceState({}, "", "/buyer/quotations")
              }}
            >
              Clear filter
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total",    value: String(scoped.length),                                       cls: "text-accent"    },
            { label: "Awaiting", value: String(scoped.filter(q => q.status === "Received" || q.status === "Pending").length), cls: "text-blue-500" },
            { label: "Accepted", value: String(scoped.filter(q => q.status === "Accepted").length),  cls: "text-emerald-500" },
            { label: "Value",    value: `$${totalVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,                      cls: "text-primary"   },
          ].map(s => (
            <Card key={s.label} className="glass-card">
              <CardContent className="p-4">
                <p className={`text-2xl font-heading font-bold ${s.cls}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.label} Quotations</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-muted/50 p-1 rounded-xl w-fit flex-wrap">
          {["All", "Pending", "Received", "Accepted", "Rejected"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >{tab}</button>
          ))}
        </div>

        {/* Quotations */}
        <div className="space-y-4">
          {isLoading && (
            <div className="py-12 text-center text-sm text-muted-foreground">Loading quotations…</div>
          )}
          {!isLoading && filtered.map(q => {
            const meta   = STATUS_META[q.status] ?? STATUS_META.Received
            const isOpen = expanded === q.id

            return (
              <Card key={q.id} className={`glass-card transition-all ${q.status === "Accepted" ? "border-emerald-500/20" : q.status === "Rejected" ? "border-red-500/15 opacity-70" : q.status === "Pending" ? "border-amber-500/20" : "hover:border-accent/30"}`}>
                <CardContent className="p-0">
                  {/* Header row */}
                  <button className="w-full text-left p-5" onClick={() => setExpanded(isOpen ? null : q.id)}>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{q.id}</span>
                          <Badge className={`text-[10px] border-0 ${meta.cls}`}>
                            <meta.icon className="w-3 h-3 mr-1" />{meta.label}
                          </Badge>
                          {q.auto && (
                            <Badge className="border-0 text-[10px]" style={{ background: "rgba(212,160,18,0.15)", color: GOLD }}>
                              <Zap className="w-3 h-3 mr-1" />Auto FOB Quote
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">· {q.rfqId}</span>
                        </div>
                        <p className="text-sm font-bold">{q.product}</p>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" />{q.qty}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{q.destination}</span>
                          <span className="flex items-center gap-1"><Ship className="w-3 h-3" />{q.incoterm}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{q.date}</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {q.status === "Pending" ? (
                          <p className="text-sm font-semibold text-amber-600">Pricing in progress…</p>
                        ) : (
                          <>
                            <p className="text-xl font-heading font-bold text-accent">{q.unitPrice}</p>
                            <p className="text-xs text-muted-foreground">Total: {q.totalValue}</p>
                            <p className="text-[10px] text-muted-foreground">Valid: {q.validity}</p>
                          </>
                        )}
                      </div>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                    </div>
                  </button>

                  {/* Expanded details */}
                  {isOpen && (
                    <div className="border-t border-border px-5 pb-5 pt-4 space-y-4">
                      {q.status === "Pending" ? (
                        <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                          <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <div className="text-xs text-muted-foreground leading-relaxed">
                            <strong className="text-foreground">Your {q.incoterm} request is with our trade desk.</strong>{" "}
                            Ocean freight and{q.incoterm === "CIF" ? " marine insurance" : ""} rates for {q.destination} are being confirmed with our shipping partners. The complete quotation — FOB price, freight{q.incoterm === "CIF" ? ", insurance" : ""} and total landed cost — will appear here within 24–48 business hours.
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid sm:grid-cols-2 gap-6">
                            {/* Price breakdown */}
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Price Breakdown</p>
                              <div className="space-y-2">
                                {q.breakdown.map(b => (
                                  <div key={b.label} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">{b.label}</span>
                                    <span className="font-semibold">{b.val}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                                  <span>Total ({q.incoterm})</span>
                                  <span className="text-accent">{q.totalValue}</span>
                                </div>
                              </div>
                            </div>

                            {/* Terms */}
                            <div className="space-y-3">
                              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Shipment & Terms</p>
                              {[
                                { label: "Incoterm",       value: q.incoterm     },
                                { label: "Destination",    value: q.destination  },
                                { label: "Payment Terms",  value: q.paymentTerms },
                                { label: "Quote Validity", value: q.validity     },
                              ].map(row => (
                                <div key={row.label} className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">{row.label}</span>
                                  <span className="font-semibold">{row.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Seller notes */}
                          <div className="p-3 rounded-xl bg-muted/30 text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">Trade Desk Notes: </span>{q.notes}
                          </div>

                          {/* Messages with Trade Desk — always visible when viewing */}
                          <div className="space-y-3 p-4 rounded-xl border border-accent/20 bg-accent/5">
                            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Messages with Trade Desk</p>
                            {loadingThread && <p className="text-xs text-muted-foreground">Loading…</p>}
                            {!loadingThread && thread.length > 0 && (
                              <div className="max-h-40 overflow-y-auto space-y-2 mb-2">
                                {thread.map(m => (
                                  <div key={m.id} className="text-xs p-2 rounded-lg bg-background border border-border">
                                    <p className="font-semibold mb-0.5">{m.user?.name || "User"}</p>
                                    <p className="whitespace-pre-wrap">{m.body}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {!loadingThread && thread.length === 0 && (
                              <p className="text-xs text-muted-foreground">No messages yet.</p>
                            )}
                            {q.status === "Received" && (
                              <>
                                <textarea
                                  ref={negotiateInputRef}
                                  value={negotiateMsg}
                                  onChange={e => setNegotiateMsg(e.target.value)}
                                  className="w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-accent resize-none"
                                  rows={3}
                                  placeholder="e.g. Can you offer $660/MT for 30 MT? We can pay TT within 3 days."
                                />
                                <div className="flex gap-2">
                                  <Button size="sm" disabled={sendingNegotiate} onClick={() => sendNegotiate(q)}>Send Counter-Offer</Button>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Actions */}
                          {q.status === "Received" ? (
                            <div className="flex flex-wrap gap-2 pt-1">
                              <Button size="sm" className="text-xs" style={{ background: "#4CAF50" }} disabled={decidingId === q.rawId} onClick={() => decide(q, "Accepted")}>
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Accept
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs" onClick={focusNegotiateComposer}>
                                <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Negotiate
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs text-red-400 hover:text-red-500" disabled={decidingId === q.rawId} onClick={() => decide(q, "Rejected")}>
                                <XCircle className="w-3.5 h-3.5 mr-1.5" /> Reject
                              </Button>
                              <Button size="sm" variant="outline" className="text-xs ml-auto" onClick={() => void downloadQuotePdf(q)}>
                                <Download className="w-3.5 h-3.5 mr-1.5" /> PDF
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" className="text-xs" onClick={() => void downloadQuotePdf(q)}>
                                <Download className="w-3.5 h-3.5 mr-1.5" /> Download PDF
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {!isLoading && filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <FileText className="w-10 h-10 mx-auto mb-4 opacity-40" />
              <p className="text-sm">No quotations in this category.</p>
            </div>
          )}
        </div>
      </div>
    </BuyerPortalLayout>
  )
}
