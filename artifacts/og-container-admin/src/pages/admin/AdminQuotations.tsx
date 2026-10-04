import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DollarSign, Save, Clock, Send, CheckCircle2, XCircle, FileText,
  Ship, Package, MapPin, Calendar, Zap, Plus, Trash2, MessageSquare, X, Loader2,
} from "lucide-react"
import {
  getFobPrices, saveFobPrice, removeFobPrice, getBuyerQuotes, adminSubmitQuote,
  quoteTotal, initAdminData, type BuyerQuote,
} from "@/lib/admin-data"
import { notify } from "@/lib/notify"
import { api, unwrapPage, ApiError } from "@/lib/api"

const GOLD = "#D4A012"

const STATUS_META: Record<BuyerQuote["status"], { label: string; cls: string; icon: React.ElementType }> = {
  pending_admin: { label: "Pending Pricing", cls: "bg-amber-500/15 text-amber-600",     icon: Clock        },
  sent:          { label: "Sent to Buyer",   cls: "bg-blue-500/15 text-blue-600",       icon: Send         },
  accepted:      { label: "Accepted",        cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  rejected:      { label: "Rejected",        cls: "bg-red-500/15 text-red-500",         icon: XCircle      },
}

export default function AdminQuotations() {
  const [prices, setPrices] = useState(getFobPrices)
  const [edits, setEdits]   = useState<Record<string, string>>({})
  const [newName, setNewName]   = useState("")
  const [newPrice, setNewPrice] = useState("")
  const [quotes, setQuotes] = useState(getBuyerQuotes)
  const [pricingId, setPricingId] = useState<string | null>(null)
  const [loadingQuotes, setLoadingQuotes] = useState(true)

  const [publicQuotes, setPublicQuotes] = useState<any[]>([])
  const [loadingPublic, setLoadingPublic] = useState(false)

  async function loadPublicQuotes() {
    setLoadingPublic(true)
    try {
      const res = await api.get("/api/admin/public-quotations", { per_page: 50 })
      setPublicQuotes(unwrapPage(res).data)
    } catch {
      setPublicQuotes([])
    } finally {
      setLoadingPublic(false)
    }
  }

  async function refreshQuotes() {
    setLoadingQuotes(true)
    try {
      await initAdminData()
      setQuotes(getBuyerQuotes())
      setPrices(getFobPrices())
    } finally {
      setLoadingQuotes(false)
    }
  }

  useEffect(() => {
    void refreshQuotes()
    void loadPublicQuotes()
    const onFocus = () => { setQuotes(getBuyerQuotes()); setPrices(getFobPrices()) }
    window.addEventListener("focus", onFocus)
    window.addEventListener("storage", onFocus)
    return () => { window.removeEventListener("focus", onFocus); window.removeEventListener("storage", onFocus) }
  }, [])
  const [form, setForm] = useState({ fobUnitPrice: "", freight: "", insurance: "", docFee: "150", notes: "" })
  const [chatQuote, setChatQuote] = useState<BuyerQuote | null>(null)
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [chatBody, setChatBody] = useState("")
  const [chatLoading, setChatLoading] = useState(false)
  const [chatSending, setChatSending] = useState(false)

  function quotationApiId(q: BuyerQuote): number | null {
    const n = Number(q.id)
    return Number.isFinite(n) && n > 0 && /^\d+$/.test(String(q.id)) ? n : null
  }

  async function openChat(q: BuyerQuote) {
    const id = quotationApiId(q)
    if (id == null) {
      notify.error("This quotation is not synced yet — refresh and try again")
      await refreshQuotes()
      return
    }
    setChatQuote(q)
    setChatBody("")
    setChatLoading(true)
    try {
      const res = await api.get<{ data: any[] }>(`/api/admin/quotations/${id}/messages`)
      setChatMessages(Array.isArray(res?.data) ? res.data : [])
    } catch (e) {
      setChatMessages([])
      notify.error(e instanceof ApiError ? e.message : "Could not load messages")
    } finally {
      setChatLoading(false)
    }
  }

  async function sendChat() {
    if (!chatQuote || !chatBody.trim()) return
    const id = quotationApiId(chatQuote)
    if (id == null) {
      notify.error("Invalid quotation id — cannot send message")
      return
    }
    setChatSending(true)
    try {
      await api.post(`/api/admin/quotations/${id}/messages`, { body: chatBody.trim() })
      setChatBody("")
      const res = await api.get<{ data: any[] }>(`/api/admin/quotations/${id}/messages`)
      setChatMessages(Array.isArray(res?.data) ? res.data : [])
      notify.success("Reply sent")
    } catch (e: any) {
      notify.error(e instanceof ApiError ? e.message : (e?.message || "Failed to send"))
    } finally {
      setChatSending(false)
    }
  }

  const pending = quotes.filter(q => q.status === "pending_admin")
  const others  = quotes.filter(q => q.status !== "pending_admin")

  function handleSavePrice(product: string) {
    const raw = edits[product]
    const price = parseFloat(raw ?? "")
    if (isNaN(price) || price <= 0) { notify.error("Enter a valid price"); return }
    saveFobPrice(product, price)
    setPrices(getFobPrices())
    setEdits(prev => { const n = { ...prev }; delete n[product]; return n })
    notify.success(`FOB price saved — ${product}: ${price}/MT`)
  }

  function handleAddProduct(e: React.FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    const price = parseFloat(newPrice)
    if (!name) { notify.error("Enter a product name"); return }
    if (getFobPrices().some(p => p.product.toLowerCase() === name.toLowerCase())) {
      notify.error("This product already exists in the price sheet"); return
    }
    if (!isFinite(price) || price <= 0) { notify.error("Enter a valid FOB price"); return }
    saveFobPrice(name, price)
    setPrices(getFobPrices())
    setNewName(""); setNewPrice("")
    notify.success(`Added ${name} — ${price}/MT`)
  }

  function handleRemoveProduct(product: string) {
    removeFobPrice(product)
    setPrices(getFobPrices())
    setEdits(prev => { const n = { ...prev }; delete n[product]; return n })
    notify.success(`${product} removed from price sheet`)
  }

  function openPricing(q: BuyerQuote) {
    setPricingId(q.id)
    const fob = getFobPrices().find(p => p.product === q.product)
    setForm({
      fobUnitPrice: String(q.fobUnitPrice || fob?.price || ""),
      freight: "", insurance: q.incoterm === "CIF" ? "" : "0", docFee: "150",
      notes: "",
    })
  }

  function handleSubmitQuote(q: BuyerQuote) {
    const fobUnitPrice = parseFloat(form.fobUnitPrice)
    const freight      = parseFloat(form.freight)
    const insurance    = parseFloat(form.insurance || "0")
    const docFee       = parseFloat(form.docFee || "0")
    if ([fobUnitPrice, freight].some(v => isNaN(v) || v < 0) || isNaN(insurance) || isNaN(docFee)) {
      notify.error("Please fill valid FOB price and freight amounts"); return
    }
    adminSubmitQuote(q.id, { fobUnitPrice, freight, insurance, docFee, notes: form.notes })
    setQuotes(getBuyerQuotes())
    setPricingId(null)
    notify.success(`Quotation ${q.id} sent to ${q.buyer}`)
  }

  return (
    <AdminLayout title="Quotations & FOB Prices" subtitle="Maintain daily FOB price sheet and price CIF/CFR quotation requests">
      <div className="space-y-8">

        {/* ── Daily FOB price sheet ── */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <DollarSign className="w-4 h-4" style={{ color: GOLD }} />
              Daily FOB Price Sheet (USD / MT)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              FOB RFQs are auto-quoted instantly from these prices. Update daily.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {prices.map(p => (
                <div key={p.product} className="flex items-center gap-2 p-3 rounded-xl border border-border bg-muted/20">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{p.product}</p>
                    <p className="text-[10px] text-muted-foreground">Updated {p.updatedAt}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-muted-foreground">$</span>
                    <Input
                      className="h-8 w-20 text-sm text-right"
                      value={edits[p.product] ?? String(p.price)}
                      onChange={e => setEdits(prev => ({ ...prev, [p.product]: e.target.value }))}
                    />
                    <Button size="sm" className="h-8 px-2" disabled={edits[p.product] === undefined}
                      onClick={() => handleSavePrice(p.product)}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                    <button
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      title="Remove product"
                      onClick={() => handleRemoveProduct(p.product)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new product */}
            <form onSubmit={handleAddProduct} className="mt-4 p-3 rounded-xl border border-dashed border-border bg-muted/10 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px] space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">New Product Name</Label>
                <Input className="h-9 text-sm" placeholder="e.g. Himalayan Pink Salt" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div className="w-36 space-y-1.5">
                <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">FOB Price ($/MT)</Label>
                <Input className="h-9 text-sm" placeholder="e.g. 320" value={newPrice} onChange={e => setNewPrice(e.target.value)} />
              </div>
              <Button type="submit" size="sm" className="h-9" style={{ background: GOLD, color: "#1F2933" }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Product
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* ── Pending CIF / CFR requests ── */}
        <div>
          <h2 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
            <Ship className="w-4 h-4" style={{ color: GOLD }} />
            Pending CIF / CFR Requests
            {pending.length > 0 && <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">{pending.length}</Badge>}
          </h2>
          {pending.length === 0 ? (
            <Card className="glass-card"><CardContent className="py-10 text-center text-muted-foreground text-sm">
              <FileText className="w-8 h-8 mx-auto mb-3 opacity-40" />
              No pending requests. CIF/CFR RFQs from buyers will appear here for pricing.
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {pending.map(q => (
                <Card key={q.id} className="glass-card border-amber-500/20">
                  <CardContent className="p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{q.id}</span>
                      <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]"><Clock className="w-3 h-3 mr-1" />Pending Pricing</Badge>
                      <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[10px]">{q.incoterm}</Badge>
                    </div>
                    <p className="text-sm font-bold">{q.product} — {q.buyer}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Package className="w-3 h-3" />{q.qtyMT} MT</span>
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{q.destination}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Requested {q.date}</span>
                      {q.requiredDeliveryDate && (
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Delivery {q.requiredDeliveryDate}</span>
                      )}
                      <span>{q.paymentTerms}</span>
                    </div>

                    {pricingId === q.id ? (
                      <div className="mt-4 p-4 rounded-xl border border-border bg-muted/20 space-y-4">
                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {[
                            { key: "fobUnitPrice", label: "FOB Price ($/MT) *" },
                            { key: "freight",      label: "Ocean Freight ($ total) *" },
                            { key: "insurance",    label: q.incoterm === "CIF" ? "Insurance ($ total) *" : "Insurance ($ total)" },
                            { key: "docFee",       label: "Documentation ($)" },
                          ].map(f => (
                            <div key={f.key} className="space-y-1.5">
                              <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">{f.label}</Label>
                              <Input className="h-9 text-sm" value={form[f.key as keyof typeof form]}
                                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] uppercase tracking-widest text-muted-foreground">Notes to Buyer</Label>
                          <textarea rows={2} value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                            className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border focus:outline-none resize-none"
                            placeholder="e.g. Freight via MSC, transit 18 days. Insurance 110% invoice value." />
                        </div>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <p className="text-xs text-muted-foreground">
                            Estimated total:{" "}
                            <span className="font-bold text-foreground">
                              ${((parseFloat(form.fobUnitPrice) || 0) * q.qtyMT + (parseFloat(form.freight) || 0) + (parseFloat(form.insurance) || 0) + (parseFloat(form.docFee) || 0)).toLocaleString()}
                            </span>
                          </p>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setPricingId(null)}>Cancel</Button>
                            <Button size="sm" onClick={() => handleSubmitQuote(q)}>
                              <Send className="w-3.5 h-3.5 mr-1.5" /> Submit Quotation
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <Button size="sm" onClick={() => openPricing(q)} style={{ background: GOLD, color: "#1F2933" }}>
                          <DollarSign className="w-3.5 h-3.5 mr-1.5" /> Price this Request
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── Public product quotations ── */}
        <div>
          <h2 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: GOLD }} />
            Public Quotations
            {publicQuotes.filter(q => q.status === "new").length > 0 && (
              <Badge className="bg-amber-500/15 text-amber-600 border-0 text-[10px]">
                {publicQuotes.filter(q => q.status === "new").length} new
              </Badge>
            )}
          </h2>
          {loadingPublic ? (
            <Card className="glass-card"><CardContent className="py-8 text-center text-sm text-muted-foreground">Loading…</CardContent></Card>
          ) : publicQuotes.length === 0 ? (
            <Card className="glass-card"><CardContent className="py-8 text-center text-sm text-muted-foreground">
              No public product quote requests yet.
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {publicQuotes.map((q: any) => (
                <Card key={q.id} className="glass-card">
                  <CardContent className="p-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={`border-0 text-[10px] ${q.status === "new" ? "bg-amber-500/15 text-amber-600" : "bg-muted text-muted-foreground"}`}>
                          {q.status}
                        </Badge>
                        <span className="text-xs font-mono text-muted-foreground">#{q.id}</span>
                      </div>
                      <p className="text-sm font-bold">{q.meta?.product_name || q.subject || "Quote request"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {q.name} · {q.email}
                        {q.meta?.company ? ` · ${q.meta.company}` : ""}
                        {q.meta?.country ? ` · ${q.meta.country}` : ""}
                        {q.meta?.quantity ? ` · Qty ${q.meta.quantity}` : ""}
                        {q.meta?.delivery_term ? ` · ${q.meta.delivery_term}` : ""}
                      </p>
                      <p className="text-xs mt-2 whitespace-pre-wrap text-muted-foreground line-clamp-3">{q.message}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {q.status === "new" && (
                        <Button size="sm" variant="outline" onClick={async () => {
                          await api.put(`/api/admin/public-quotations/${q.id}`, { status: "read" })
                          loadPublicQuotes()
                          notify.success("Marked as read")
                        }}>Mark Read</Button>
                      )}
                      <Button size="sm" onClick={async () => {
                        await api.put(`/api/admin/public-quotations/${q.id}`, { status: "replied" })
                        loadPublicQuotes()
                        notify.success("Marked as replied")
                      }}>Mark Replied</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* ── Issued quotations ── */}
        <div>
          <h2 className="text-sm font-heading font-bold mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: GOLD }} /> Issued Quotations
          </h2>
          {loadingQuotes ? (
            <Card className="glass-card"><CardContent className="py-8 text-center text-muted-foreground text-sm flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading quotations…
            </CardContent></Card>
          ) : others.length === 0 ? (
            <Card className="glass-card"><CardContent className="py-8 text-center text-muted-foreground text-sm">
              No quotations issued yet.
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {others.map(q => {
                const meta = STATUS_META[q.status]
                return (
                  <Card key={q.id} className="glass-card">
                    <CardContent className="p-4 flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{q.id}</span>
                          <Badge className={`text-[10px] border-0 ${meta.cls}`}><meta.icon className="w-3 h-3 mr-1" />{meta.label}</Badge>
                          {q.source === "auto-fob" && (
                            <Badge className="border-0 text-[10px]" style={{ background: "rgba(212,160,18,0.15)", color: GOLD }}>
                              <Zap className="w-3 h-3 mr-1" />Auto FOB
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-bold mt-0.5">{q.product} · {q.qtyMT} MT · {q.incoterm} — {q.buyer}</p>
                        <p className="text-xs text-muted-foreground">{q.destination} · Valid until {q.validUntil}</p>
                      </div>
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <Button size="sm" variant="outline" onClick={() => openChat(q)}>
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" /> Messages
                        </Button>
                        <div>
                          <p className="text-base font-heading font-bold" style={{ color: GOLD }}>${quoteTotal(q).toLocaleString()}</p>
                          <p className="text-[10px] text-muted-foreground">${q.fobUnitPrice.toLocaleString()}/MT FOB</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {chatQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-lg max-h-[80vh] flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2 shrink-0">
              <CardTitle className="text-base">
                Messages — Quotation #{chatQuote.id} · {chatQuote.buyer}
              </CardTitle>
              <button type="button" onClick={() => setChatQuote(null)}><X className="w-4 h-4" /></button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2 min-h-[200px]">
              {chatLoading && <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin" /></div>}
              {!chatLoading && chatMessages.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">No messages yet. Buyer questions will appear here.</p>
              )}
              {chatMessages.map((m: any) => (
                <div key={m.id} className="p-3 rounded-xl bg-muted/40 text-sm">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">{m.user?.name || "User"} · {m.created_at ? new Date(m.created_at).toLocaleString() : ""}</p>
                  <p className="whitespace-pre-wrap">{m.body}</p>
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t border-border space-y-2 shrink-0">
              <textarea
                rows={2}
                value={chatBody}
                onChange={e => setChatBody(e.target.value)}
                className="w-full px-3 py-2 rounded-lg text-sm bg-background border border-border focus:outline-none resize-none"
                placeholder="Reply to buyer…"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setChatQuote(null)}>Close</Button>
                <Button size="sm" disabled={chatSending || !chatBody.trim()} onClick={sendChat}>
                  {chatSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Send className="w-3.5 h-3.5 mr-1.5" /> Reply</>}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  )
}
