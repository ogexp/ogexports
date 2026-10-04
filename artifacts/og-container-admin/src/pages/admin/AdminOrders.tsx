import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { PaymentDetailsDialog, type PaymentDetailsInfo } from "@/components/admin/PaymentDetailsDialog"
import { TradeDocumentTypeChecklist } from "@/components/admin/TradeDocumentTypeChecklist"
import {
  ShoppingBag, FileText, ClipboardList, Search, CheckCircle2, Package, Truck, ChevronDown, CircleDollarSign,
  FolderOpen, Download, Eye, Loader2, CreditCard,
} from "lucide-react"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getOrders, getRFQs, getQuotations, updateOrderStatus, updateRFQStatus,
  adminQuoteFromRfq, parseQtyMt, suggestedFobPrice, refreshAdminOrdersData,
  initAdminData,
  fetchOrderDocuments, uploadOrderDocument, deleteOrderDocument,
  resolveOrderApiId,
  upsertDocumentByType,
  type AdminOrder, type AdminRFQ, type AdminQuotation, type AdminOrderDocument,
} from "@/lib/admin-data"
import { downloadAuthenticatedFile, downloadPublicFile, openPublicFile, resolveAttachmentUrl, resolveDocumentUrl, isImageMime } from "@/lib/api"
import {
  ORDER_STATUS_ACTIONS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  orderStatusLabel,
  type OrderStatusCode,
} from "@/lib/order-statuses"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

const RFQ_QUOTE_STATUS: Record<string, { bg: string; color: string; label: string }> = {
  new: { bg: "#eff6ff", color: "#3b82f6", label: "New" },
  quoted: { bg: "#fffbeb", color: "#f59e0b", label: "Quoted" },
  converted: { bg: "#f0fdf4", color: GREEN, label: "Converted" },
  expired: { bg: "#f8fafc", color: "#94a3b8", label: "Expired" },
  sent: { bg: "#eff6ff", color: "#3b82f6", label: "Sent" },
  accepted: { bg: "#f0fdf4", color: GREEN, label: "Accepted" },
  draft: { bg: "#f8fafc", color: "#94a3b8", label: "Draft" },
}

function Badge({ status }: { status: string }) {
  const orderMeta = ORDER_STATUS_COLORS[status as OrderStatusCode]
  if (orderMeta) {
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: orderMeta.bg, color: orderMeta.color }}>
        {ORDER_STATUS_LABELS[status as OrderStatusCode]}
      </span>
    )
  }
  const s = RFQ_QUOTE_STATUS[status] || { bg: "#f8fafc", color: "#64748b", label: status }
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: s.bg, color: s.color }}>{s.label}</span>
}

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm">
      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white">✕</button>
    </div>
  )
}

const ORDER_ACTIONS = ORDER_STATUS_ACTIONS

export default function AdminOrders() {
  const [activeTab, setActiveTab] = useState("orders")
  const [search, setSearch] = useState("")
  const [orders, setOrders] = useState<AdminOrder[]>(() => getOrders())
  const [rfqs, setRFQs] = useState<AdminRFQ[]>(() => getRFQs())
  const [quotations, setQuotations] = useState<AdminQuotation[]>(() => getQuotations())
  const [toast, setToast] = useState("")
  const [statusMenu, setStatusMenu] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; openUp: boolean } | null>(null)
  const [showPayments, setShowPayments] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<PaymentDetailsInfo | null>(null)

  const [quoteRfq, setQuoteRfq] = useState<AdminRFQ | null>(null)
  const [quotePrice, setQuotePrice] = useState("")
  const [quoteSaving, setQuoteSaving] = useState(false)

  const [docsOrder, setDocsOrder] = useState<AdminOrder | null>(null)
  const [orderDocs, setOrderDocs] = useState<AdminOrderDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [pdfLoadingId, setPdfLoadingId] = useState<string | null>(null)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  async function downloadOrderPdf(o: AdminOrder) {
    const apiId = resolveOrderApiId(o.id)
    setPdfLoadingId(o.id)
    try {
      await downloadAuthenticatedFile(`/api/admin/orders/${apiId}/pdf`, `${o.id}.pdf`)
      showToast("Order PDF downloaded")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "PDF download failed")
    } finally {
      setPdfLoadingId(null)
    }
  }

  const refreshAll = () => {
    setOrders(getOrders())
    setRFQs(getRFQs())
    setQuotations(getQuotations())
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await initAdminData()
      await refreshAdminOrdersData()
      if (!cancelled) refreshAll()
    })()
    return () => { cancelled = true }
  }, [])

  const quoteQtyMt = useMemo(
    () => (quoteRfq ? parseQtyMt(quoteRfq.qty) : 0),
    [quoteRfq],
  )
  const quotePriceNum = Number(quotePrice)
  const quoteTotal = (Number.isFinite(quotePriceNum) ? quotePriceNum : 0) * (quoteQtyMt || 0)

  const openQuoteModal = (r: AdminRFQ) => {
    setQuoteRfq(r)
    const suggested = suggestedFobPrice(r.product)
    setQuotePrice(suggested > 0 ? String(suggested) : "")
  }

  const handleSaveQuote = async () => {
    if (!quoteRfq) return
    const price = Number(quotePrice)
    if (!Number.isFinite(price) || price < 0) {
      showToast("Enter a valid quote price ($/MT)")
      return
    }
    setQuoteSaving(true)
    try {
      await adminQuoteFromRfq(quoteRfq.id, {
        fobUnitPrice: price,
        qtyMt: quoteQtyMt > 0 ? quoteQtyMt : 1,
      })
      refreshAll()
      setQuoteRfq(null)
      showToast(`Quote saved for RFQ ${quoteRfq.id} — total $${quoteTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Unable to save quote")
    } finally {
      setQuoteSaving(false)
    }
  }

  const handleOrderStatus = async (id: string, status: AdminOrder["status"]) => {
    setStatusMenu(null)
    setMenuPos(null)
    try {
      await updateOrderStatus(id, status)
      setOrders(getOrders())
      showToast(`Order ${id} updated to ${orderStatusLabel(status)}`)
    } catch (e) {
      setOrders(getOrders())
      showToast(e instanceof Error ? e.message : "Unable to update order status")
    }
  }

  const openStatusMenu = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (statusMenu === id) {
      setStatusMenu(null)
      setMenuPos(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const menuHeight = Math.min(ORDER_ACTIONS.length * 32 + 16, 320)
    const spaceBelow = window.innerHeight - rect.bottom
    const openUp = spaceBelow < menuHeight + 8
    setMenuPos({
      top: openUp ? rect.top - 4 : rect.bottom + 4,
      left: Math.max(8, rect.right - 200),
      openUp,
    })
    setStatusMenu(id)
  }

  const handleRFQStatus = (id: string, status: AdminRFQ["status"]) => {
    updateRFQStatus(id, status)
    setRFQs(getRFQs())
    showToast(`RFQ ${id} updated to ${status}`)
  }

  const openDocsModal = async (order: AdminOrder) => {
    setDocsOrder(order)
    setDocsLoading(true)
    try {
      const docs = await fetchOrderDocuments(order.id)
      setOrderDocs(docs)
    } catch (e) {
      setOrderDocs([])
      showToast(e instanceof Error ? e.message : "Unable to load documents")
    } finally {
      setDocsLoading(false)
    }
  }

  const closeDocsModal = () => {
    if (uploadingType) return
    setDocsOrder(null)
    setOrderDocs([])
  }

  const handleUploadDoc = async (type: string, file: File) => {
    if (!docsOrder) return
    if (file.size > 10 * 1024 * 1024) {
      showToast("Each file must be under 10 MB")
      return
    }
    setUploadingType(type)
    try {
      const doc = await uploadOrderDocument(docsOrder.id, file, type)
      setOrderDocs(prev => upsertDocumentByType(prev, doc))
      showToast(`${type} uploaded`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setUploadingType(null)
    }
  }

  const handleDeleteDoc = async (doc: AdminOrderDocument) => {
    if (!docsOrder) return
    try {
      await deleteOrderDocument(docsOrder.id, doc.id)
      setOrderDocs(prev => prev.filter(d => d.id !== doc.id))
      showToast("Document deleted")
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Delete failed")
    }
  }

  const handleViewDoc = (doc: AdminOrderDocument) => {
    const url = resolveDocumentUrl(doc)
    if (!url) {
      showToast("Document URL not available")
      return
    }
    openPublicFile(url)
  }

  const handleDownloadDoc = (doc: AdminOrderDocument) => {
    const url = resolveDocumentUrl(doc)
    if (!url) {
      showToast("Document URL not available")
      return
    }
    downloadPublicFile(url, doc.title || doc.type)
  }

  const filteredOrders = orders.filter(o =>
    o.buyer.toLowerCase().includes(search.toLowerCase()) ||
    o.product.toLowerCase().includes(search.toLowerCase()) ||
    o.id.toLowerCase().includes(search.toLowerCase())
  )

  const filteredRFQs = rfqs.filter(r =>
    r.buyer.toLowerCase().includes(search.toLowerCase()) ||
    r.product.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  )

  const TABS = [
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "rfqs", label: "RFQs", icon: FileText },
    { id: "quotations", label: "Quotations", icon: ClipboardList },
  ]

  return (
    <AdminLayout title="Order Management" subtitle="Manage orders, RFQs and quotations">
      <div className="p-6 space-y-5">
        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Orders", value: String(orders.length), icon: ShoppingBag, color: "#3b82f6" },
            { label: "Pending RFQs", value: String(rfqs.filter(r => r.status === "new").length), icon: FileText, color: "#f59e0b" },
            { label: "Production / Procurement", value: String(orders.filter(o => o.status === "production").length), icon: Package, color: "#8b5cf6" },
            { label: "In Transit", value: String(orders.filter(o => o.status === "in_transit").length), icon: Truck, color: "#0ea5e9" },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
              <p className="text-2xl font-bold" style={{ color: EMERALD }}>{k.value}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{k.label}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-muted/40 p-1 rounded-xl">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <t.icon className="w-4 h-4" />{t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search…"
                className="pl-9 pr-3 py-2 rounded-lg text-sm border border-border bg-white w-52 focus:outline-none focus:border-accent" />
            </div>
            <Link href="/admin/quotations"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white whitespace-nowrap transition-opacity hover:opacity-90"
              style={{ background: EMERALD }}>
              <CircleDollarSign className="w-4 h-4" /> Set Quotations &amp; FOB Prices
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <div className="p-0">
            {/* Orders Table */}
            {activeTab === "orders" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Order ID", "Buyer", "Product", "Qty", "Value", "Destination", "Status", "Payment", "Date", "Actions"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-3 text-[11px] font-mono font-bold" style={{ color: EMERALD }}>{o.id}</td>
                        <td className="px-3 py-3 text-[12px] font-medium">{o.buyer}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{o.product}</td>
                        <td className="px-3 py-3 text-[12px]">{o.qty}</td>
                        <td className="px-3 py-3 text-[12px] font-semibold">{o.value}</td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground max-w-[140px] truncate" title={o.destination || undefined}>{o.destination || "—"}</td>
                        <td className="px-3 py-3"><Badge status={o.status} /></td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground max-w-[120px] truncate" title={o.payment}>{o.payment}</td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{o.date}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => void openDocsModal(o)}
                              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] font-medium hover:bg-muted transition-colors whitespace-nowrap"
                              title="Upload shipment documents"
                            >
                              <FolderOpen className="w-3 h-3" />
                              Docs
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPaymentInfo({
                                  orderLabel: o.id,
                                  buyer: o.buyer,
                                  paymentMethod: o.paymentMethod,
                                  paymentStatus: o.paymentStatus,
                                  paymentNotes: o.paymentNotes,
                                })
                                setShowPayments(true)
                              }}
                              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] font-medium hover:bg-muted transition-colors whitespace-nowrap"
                              title="Payment details"
                            >
                              <CreditCard className="w-3 h-3" />
                              Payments
                            </button>
                            <button
                              type="button"
                              onClick={() => void downloadOrderPdf(o)}
                              disabled={pdfLoadingId === o.id}
                              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] font-medium hover:bg-muted transition-colors whitespace-nowrap disabled:opacity-50"
                              title="Download order PDF"
                            >
                              <Download className="w-3 h-3" />
                              {pdfLoadingId === o.id ? "…" : "PDF"}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => openStatusMenu(o.id, e)}
                              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] font-medium hover:bg-muted transition-colors"
                            >
                              Status <ChevronDown className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && <tr><td colSpan={10} className="text-center py-8 text-sm text-muted-foreground">No orders found</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* RFQs Table */}
            {activeTab === "rfqs" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["RFQ ID", "Buyer", "Product", "Qty", "Incoterm", "Payment", "Delivery", "Destination", "Status", "Submitted", "Actions"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRFQs.map(r => (
                      <tr key={r.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-3 text-[11px] font-mono font-bold" style={{ color: EMERALD }}>{r.id}</td>
                        <td className="px-3 py-3 text-[12px] font-medium">{r.buyer}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{r.product}</td>
                        <td className="px-3 py-3 text-[12px]">{r.qty}</td>
                        <td className="px-3 py-3 text-[12px]">{r.incoterm || "—"}</td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground max-w-[120px] truncate" title={r.paymentTerms || ""}>{r.paymentTerms || "—"}</td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground whitespace-nowrap">{r.requiredDeliveryDate || "—"}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{r.destination}</td>
                        <td className="px-3 py-3"><Badge status={r.status} /></td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{r.submitted}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-1">
                            {r.status === "new" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openQuoteModal(r)}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100"
                                >
                                  Quote
                                </button>
                                <button onClick={() => handleRFQStatus(r.id, "expired")} className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-500 hover:bg-red-100">Expire</button>
                              </>
                            )}
                            {r.status === "quoted" && (
                              <button
                                type="button"
                                onClick={() => openQuoteModal(r)}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 hover:bg-blue-100"
                              >
                                Update Quote
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredRFQs.length === 0 && <tr><td colSpan={11} className="text-center py-8 text-sm text-muted-foreground">No RFQs found</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* Quotations Table */}
            {activeTab === "quotations" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      {["Quote ID", "RFQ", "Buyer", "Product", "Value", "Valid Until", "Status", "Terms"].map(h => (
                        <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {quotations.map(q => (
                      <tr key={q.id} className="border-b border-border/50 hover:bg-muted/20">
                        <td className="px-3 py-3 text-[11px] font-mono font-bold" style={{ color: EMERALD }}>{q.id}</td>
                        <td className="px-3 py-3 text-[11px] font-mono text-muted-foreground">{q.rfq}</td>
                        <td className="px-3 py-3 text-[12px] font-medium">{q.buyer}</td>
                        <td className="px-3 py-3 text-[12px] text-muted-foreground">{q.product}</td>
                        <td className="px-3 py-3 text-[12px] font-semibold">{q.totalValue}</td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{q.validUntil}</td>
                        <td className="px-3 py-3"><Badge status={q.status} /></td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground">{q.terms}</td>
                      </tr>
                    ))}
                    {quotations.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-sm text-muted-foreground">No quotations found</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={quoteRfq != null} onOpenChange={(open) => { if (!open && !quoteSaving) setQuoteRfq(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Set Quote Price</DialogTitle>
            <DialogDescription>
              Update the unit quote price for this RFQ. Total = quote price × quantity.
            </DialogDescription>
          </DialogHeader>
          {quoteRfq && (
            <div className="space-y-4 py-1">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">RFQ</span>
                  <span className="font-mono font-bold" style={{ color: EMERALD }}>{quoteRfq.id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Buyer</span>
                  <span className="font-medium text-right">{quoteRfq.buyer}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium text-right">{quoteRfq.product}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Quantity</span>
                  <span className="font-medium">{quoteRfq.qty}{quoteQtyMt > 0 ? ` (${quoteQtyMt} MT)` : ""}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Incoterm</span>
                  <span className="font-medium">{quoteRfq.incoterm || "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Payment terms</span>
                  <span className="font-medium text-right">{quoteRfq.paymentTerms || "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Required delivery</span>
                  <span className="font-medium">{quoteRfq.requiredDeliveryDate || "—"}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Destination</span>
                  <span className="font-medium text-right">{quoteRfq.destination}</span>
                </div>
              </div>

              {(quoteRfq.attachments?.length ?? 0) > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Buyer Attachments</p>
                  <div className="grid grid-cols-2 gap-2">
                    {quoteRfq.attachments!.map((a) => {
                      const url = resolveAttachmentUrl(a.path, a.url)
                      const image = a.is_image === true || isImageMime(a.mime, a.original_name || a.path)
                      return (
                        <a
                          key={a.id ?? a.path}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-border overflow-hidden hover:border-accent/50 transition-colors group"
                        >
                          {image ? (
                            <div className="relative">
                              <img src={url} alt={a.original_name || "Attachment"} className="w-full h-28 object-cover" />
                              <span className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-colors">
                                <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 drop-shadow" />
                              </span>
                            </div>
                          ) : (
                            <div className="h-28 flex flex-col items-center justify-center gap-1 bg-muted/30 p-2">
                              <FileText className="w-6 h-6 text-muted-foreground" />
                              <span className="text-[11px] text-center truncate w-full px-1">{a.original_name || "Document"}</span>
                              <span className="text-[10px] text-accent flex items-center gap-1"><Download className="w-3 h-3" /> Open</span>
                            </div>
                          )}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-widest text-muted-foreground">Quote Price ($/MT)</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={quotePrice}
                  onChange={(e) => setQuotePrice(e.target.value)}
                  placeholder="e.g. 695"
                  className="h-10"
                  autoFocus
                />
                <p className="text-[11px] text-muted-foreground">
                  Prefills from the daily FOB price sheet when available.
                </p>
              </div>

              <div className="rounded-xl border border-border p-3 flex items-center justify-between" style={{ borderColor: GOLD, background: "rgba(212,160,18,0.08)" }}>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Estimated Total</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ${Number.isFinite(quotePriceNum) ? quotePriceNum.toLocaleString() : "0"} × {quoteQtyMt || 0} MT
                  </p>
                </div>
                <p className="text-xl font-bold" style={{ color: EMERALD }}>
                  ${quoteTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={quoteSaving} onClick={() => setQuoteRfq(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={quoteSaving}
              style={{ background: EMERALD }}
              className="text-white"
              onClick={() => void handleSaveQuote()}
            >
              {quoteSaving ? "Saving…" : "Save Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={docsOrder != null} onOpenChange={(open) => { if (!open) closeDocsModal() }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Shipment Documents</DialogTitle>
            <DialogDescription>
              Upload, view, or delete PDF and image documents for this order. Buyers will see them under Trade Documents and on the order details page.
            </DialogDescription>
          </DialogHeader>
          {docsOrder && (
            <div className="space-y-4 py-1">
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Order</span>
                  <span className="font-mono font-bold" style={{ color: EMERALD }}>{docsOrder.id}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Buyer</span>
                  <span className="font-medium text-right">{docsOrder.buyer}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Product</span>
                  <span className="font-medium text-right">{docsOrder.product}</span>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Document Types</p>
                <TradeDocumentTypeChecklist
                  documents={orderDocs}
                  loading={docsLoading}
                  uploadingType={uploadingType}
                  onUpload={(type, file) => void handleUploadDoc(type, file)}
                  onView={handleViewDoc}
                  onDownload={handleDownloadDoc}
                  onDelete={(doc) => void handleDeleteDoc(doc)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={!!uploadingType} onClick={closeDocsModal}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PaymentDetailsDialog
        open={showPayments}
        onOpenChange={setShowPayments}
        info={paymentInfo}
      />

      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
      {statusMenu && menuPos && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => { setStatusMenu(null); setMenuPos(null) }}
          />
          <div
            className="fixed z-50 bg-white border border-border rounded-xl shadow-lg py-1 min-w-[200px] max-h-[320px] overflow-y-auto"
            style={{
              left: menuPos.left,
              ...(menuPos.openUp
                ? { bottom: window.innerHeight - menuPos.top }
                : { top: menuPos.top }),
            }}
          >
            {ORDER_ACTIONS.map(s => {
              const order = orders.find(o => o.id === statusMenu)
              const colors = ORDER_STATUS_COLORS[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleOrderStatus(statusMenu, s)}
                  className="w-full text-left px-3 py-1.5 text-[11px] hover:bg-muted transition-colors flex items-center gap-2"
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors?.color || "#94a3b8" }} />
                  <span className="flex-1">{ORDER_STATUS_LABELS[s]}</span>
                  {order?.status === s && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
