import { useEffect, useRef, useState } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { PaymentDetailsDialog, type PaymentDetailsInfo } from "@/components/admin/PaymentDetailsDialog"
import { TradeDocumentTypeChecklist } from "@/components/admin/TradeDocumentTypeChecklist"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Ship, MapPin, CheckCircle2, Clock, Search, Anchor, ChevronDown,
  FolderOpen, Plus, Loader2, CreditCard,
} from "lucide-react"
import {
  getShipments,
  updateShipmentStatus,
  updateShipmentDetails,
  uploadShipmentDocument,
  deleteShipmentDocument,
  createShipment,
  getUsers,
  type AdminShipment,
  type AdminShipmentDocument,
} from "@/lib/admin-data"
import { downloadPublicFile, openPublicFile, resolveDocumentUrl } from "@/lib/api"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"

const STATUS: Record<string, { bg: string; color: string; label: string }> = {
  pending: { bg: "#fffbeb", color: "#f59e0b", label: "Pending" },
  booking: { bg: "#eff6ff", color: "#3b82f6", label: "Booked" },
  "in-transit": { bg: "#f0f9ff", color: "#0ea5e9", label: "In Transit" },
  arrived: { bg: "#f5f3ff", color: "#8b5cf6", label: "Arrived" },
  delivered: { bg: "#f0fdf4", color: GREEN, label: "Delivered" },
}

/** Pending + all 8 journey milestones for Update dropdown / Current Status select. */
const STATUS_FLOW: { status: AdminShipment["status"]; milestone: string }[] = [
  { status: "pending", milestone: "Awaiting Booking" },
  { status: "booking", milestone: "Booking Confirmed" },
  { status: "booking", milestone: "Gate-In at Port" },
  { status: "booking", milestone: "Vessel Loaded" },
  { status: "in-transit", milestone: "Departed Origin" },
  { status: "in-transit", milestone: "In Transit" },
  { status: "arrived", milestone: "Arrived Destination" },
  { status: "arrived", milestone: "Customs Cleared" },
  { status: "delivered", milestone: "Final Delivery" },
]

const MILESTONES = [
  "Booking Confirmed", "Gate-In at Port", "Vessel Loaded", "Departed Origin",
  "In Transit", "Arrived Destination", "Customs Cleared", "Final Delivery",
]

/** Fallback active index into MILESTONES for each coarse status. */
const STATUS_ACTIVE_INDEX: Record<AdminShipment["status"], number> = {
  pending: 0,
  booking: 0,
  "in-transit": 4,
  arrived: 5,
  delivered: 7,
}

function dashToEmpty(v: string | undefined) {
  if (!v || v === "—") return ""
  return v
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

type DetailForm = {
  vessel: string
  container: string
  line: string
  origin: string
  destination: string
  etd: string
  eta: string
  milestone: string
}

function formFromShipment(s: AdminShipment): DetailForm {
  return {
    vessel: dashToEmpty(s.vessel),
    container: dashToEmpty(s.container),
    line: dashToEmpty(s.line),
    origin: dashToEmpty(s.origin),
    destination: dashToEmpty(s.destination),
    etd: s.etdIso || "",
    eta: s.etaIso || "",
    milestone: s.milestone && s.milestone !== "—" ? s.milestone : "Awaiting Booking",
  }
}

function milestoneToStatus(milestone: string): AdminShipment["status"] {
  const found = STATUS_FLOW.find(sf => sf.milestone === milestone)
  return found?.status || "pending"
}

export default function AdminShipments() {
  const [shipments, setShipments] = useState<AdminShipment[]>(() => getShipments())
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<AdminShipment | null>(null)
  const [detailForm, setDetailForm] = useState<DetailForm | null>(null)
  const [savingDetails, setSavingDetails] = useState(false)
  const [toast, setToast] = useState("")
  const [uploadingType, setUploadingType] = useState<string | null>(null)
  const [focusDocs, setFocusDocs] = useState(false)
  const docsSectionRef = useRef<HTMLDivElement>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [paymentInfo, setPaymentInfo] = useState<PaymentDetailsInfo | null>(null)
  const [showPayments, setShowPayments] = useState(false)
  const [createForm, setCreateForm] = useState({
    order_id: "",
    buyer_id: "",
    product_snapshot: "",
    container: "",
    vessel: "",
    shipping_line: "",
    origin: "Karachi, PK",
    destination: "",
    etd: "",
    eta: "",
  })

  const buyers = getUsers().filter(u => (u.role || "").toLowerCase() === "buyer" || (u as any).accountType === "buyer")

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000) }
  const refresh = () => {
    const updated = getShipments()
    setShipments(updated)
    if (selected) {
      const found = updated.find(s => s.id === selected.id)
      if (found) {
        setSelected(found)
        setDetailForm(formFromShipment(found))
      }
    }
  }

  useEffect(() => {
    if (selected) setDetailForm(formFromShipment(selected))
    else setDetailForm(null)
  }, [selected?.id])

  const handleStatusUpdate = (id: string, status: AdminShipment["status"], milestone: string) => {
    updateShipmentStatus(id, status, milestone)
    refresh()
    showToast(`Shipment ${id} updated to ${milestone}`)
  }

  const openPayments = (s: AdminShipment) => {
    setPaymentInfo({
      orderLabel: s.order,
      buyer: s.buyer,
      paymentMethod: s.paymentMethod,
      paymentStatus: s.paymentStatus,
      paymentNotes: s.paymentNotes,
    })
    setShowPayments(true)
  }

  const selectShipment = (s: AdminShipment, openDocs = false) => {
    const next = selected?.id === s.id && !openDocs ? null : s
    setSelected(next)
    setFocusDocs(openDocs)
    if (openDocs && next) {
      setTimeout(() => docsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50)
    }
  }

  const handleSaveDetails = async () => {
    if (!selected || !detailForm) return
    const status = milestoneToStatus(detailForm.milestone)
    setSavingDetails(true)
    try {
      const mapped = await updateShipmentDetails(selected.id, {
        vessel: detailForm.vessel || undefined,
        container: detailForm.container || undefined,
        shipping_line: detailForm.line || undefined,
        origin: detailForm.origin || undefined,
        destination: detailForm.destination || undefined,
        etd: detailForm.etd || null,
        eta: detailForm.eta || null,
        status,
        current_milestone: detailForm.milestone,
      })
      setSelected(mapped)
      setDetailForm(formFromShipment(mapped))
      setShipments(getShipments())
      showToast("Shipment details saved")
    } catch (e: any) {
      showToast(e?.message || "Save failed")
    } finally {
      setSavingDetails(false)
    }
  }

  const handleUpload = async (type: string, file: File) => {
    if (!selected) return
    if (file.size > 10 * 1024 * 1024) {
      showToast("Each file must be under 10 MB")
      return
    }
    setUploadingType(type)
    try {
      await uploadShipmentDocument(selected.id, file, type)
      refresh()
      showToast(`${type} uploaded`)
    } catch (e: any) {
      refresh()
      showToast(e?.message || "Upload failed")
    } finally {
      setUploadingType(null)
    }
  }

  const handleDeleteDoc = async (doc: AdminShipmentDocument) => {
    if (!selected) return
    try {
      await deleteShipmentDocument(selected.id, doc.id)
      refresh()
      showToast("Document deleted")
    } catch (e: any) {
      showToast(e?.message || "Delete failed")
    }
  }

  const handleDownloadDoc = (doc: AdminShipmentDocument) => {
    const url = resolveDocumentUrl(doc)
    if (!url) {
      showToast("Document URL not available")
      return
    }
    downloadPublicFile(url, doc.title || doc.type)
  }

  const handleViewDoc = (doc: AdminShipmentDocument) => {
    const url = resolveDocumentUrl(doc)
    if (!url) {
      showToast("Document URL not available")
      return
    }
    openPublicFile(url)
  }

  const filtered = shipments.filter(s =>
    s.id.toLowerCase().includes(search.toLowerCase()) ||
    s.buyer.toLowerCase().includes(search.toLowerCase()) ||
    s.vessel.toLowerCase().includes(search.toLowerCase()) ||
    s.destination.toLowerCase().includes(search.toLowerCase())
  )

  const getActiveMilestoneIndex = (s: AdminShipment) => {
    const m = s.milestone
    if (m && m !== "—") {
      const idx = MILESTONES.indexOf(m)
      if (idx >= 0) return idx
      if (m === "Awaiting Booking") return 0
    }
    return STATUS_ACTIVE_INDEX[s.status] ?? 0
  }

  async function handleCreateShipment() {
    if (!createForm.buyer_id) {
      showToast("Select a buyer")
      return
    }
    setCreating(true)
    try {
      await createShipment({
        buyer_id: Number(createForm.buyer_id),
        order_id: createForm.order_id ? Number(createForm.order_id) : null,
        product_snapshot: createForm.product_snapshot || undefined,
        container: createForm.container || undefined,
        vessel: createForm.vessel || undefined,
        shipping_line: createForm.shipping_line || undefined,
        origin: createForm.origin || undefined,
        destination: createForm.destination || undefined,
        etd: createForm.etd || undefined,
        eta: createForm.eta || undefined,
      })
      refresh()
      setShowCreate(false)
      showToast("Shipment created")
    } catch (e: any) {
      showToast(e?.message || "Create failed")
    } finally {
      setCreating(false)
    }
  }

  const inputClass =
    "w-full mt-0.5 h-8 px-2 rounded-lg border border-border text-[12px] bg-background focus:outline-none focus:border-primary"

  return (
    <AdminLayout title="Shipment Management" subtitle="Container tracking, vessel management and logistics control">
      <div className="p-6 space-y-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: EMERALD }}
          >
            <Plus className="w-4 h-4" /> Create Shipment
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Shipments", value: String(shipments.length), icon: Ship, color: EMERALD },
            { label: "In Transit", value: String(shipments.filter(s => s.status === "in-transit").length), icon: Anchor, color: "#0ea5e9" },
            { label: "Pending Booking", value: String(shipments.filter(s => s.status === "pending").length), icon: Clock, color: "#f59e0b" },
            { label: "Delivered", value: String(shipments.filter(s => s.status === "delivered").length), icon: CheckCircle2, color: GREEN },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <k.icon className="w-4 h-4 mb-2" style={{ color: k.color }} />
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-5">
          {/* Shipment List */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-border">
            <div className="p-4 border-b border-border">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by ID, buyer, vessel..."
                  className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {["Shipment", "Buyer", "Route", "Vessel", "ETD/ETA", "Status", "Actions"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => {
                    const st = STATUS[s.status] || STATUS.pending
                    const docCount = s.documents?.length || 0
                    const hasOrder = Boolean(s.orderId) || (s.order && s.order !== "—")
                    return (
                      <tr key={s.id}
                        className={`border-b border-border/50 hover:bg-muted/20 cursor-pointer transition-colors ${selected?.id === s.id ? "bg-muted/30" : ""}`}
                        onClick={() => selectShipment(s)}>
                        <td className="px-3 py-3">
                          <div className="text-[11px] font-mono font-bold" style={{ color: EMERALD }}>{s.id}</div>
                          <div className="text-[10px] text-muted-foreground">{s.order}</div>
                        </td>
                        <td className="px-3 py-3 text-[12px] font-medium max-w-[100px] truncate">{s.buyer}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1 text-[11px]">
                            <MapPin className="w-3 h-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{s.origin} → {s.destination}</span>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-[11px] text-muted-foreground max-w-[80px] truncate">{s.vessel}</td>
                        <td className="px-3 py-3">
                          <div className="text-[10px] text-muted-foreground">ETD: {s.etd}</div>
                          <div className="text-[10px] text-muted-foreground">ETA: {s.eta}</div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => selectShipment(s, true)}
                              className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] font-medium hover:bg-muted transition-colors"
                              title="Documents"
                            >
                              <FolderOpen className="w-3 h-3" />
                              Docs{docCount > 0 ? ` (${docCount})` : ""}
                            </button>
                            {hasOrder && (
                              <button
                                type="button"
                                onClick={() => openPayments(s)}
                                className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] font-medium hover:bg-muted transition-colors"
                                title="Payment details"
                              >
                                <CreditCard className="w-3 h-3" />
                                Payments
                              </button>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="flex items-center gap-1 px-2 py-1 rounded border border-border text-[10px] font-medium hover:bg-muted transition-colors">
                                  Update <ChevronDown className="w-3 h-3" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="min-w-[200px] max-h-[320px] overflow-y-auto rounded-xl">
                                {STATUS_FLOW.map(sf => (
                                  <DropdownMenuItem
                                    key={sf.milestone}
                                    onSelect={() => handleStatusUpdate(s.id, sf.status, sf.milestone)}
                                    className="text-[11px] cursor-pointer"
                                  >
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: STATUS[sf.status]?.color }} />
                                    {sf.milestone}
                                    {s.milestone === sf.milestone && <CheckCircle2 className="w-3 h-3 ml-auto text-green-500 shrink-0" />}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-sm text-muted-foreground">No shipments found</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          {/* Shipment Detail */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-border">
            {selected && detailForm ? (
              <div className="p-5 space-y-4 max-h-[calc(100vh-220px)] overflow-y-auto">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-mono font-bold" style={{ color: EMERALD }}>{selected.id}</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: STATUS[selected.status]?.bg, color: STATUS[selected.status]?.color }}>{STATUS[selected.status]?.label}</span>
                  </div>
                  <h3 className="font-bold text-sm">{selected.product}</h3>
                  <p className="text-[11px] text-muted-foreground">{selected.buyer}</p>
                </div>

                <div className="space-y-2.5 text-[12px]">
                  {([
                    { key: "vessel" as const, label: "Vessel", type: "text" },
                    { key: "container" as const, label: "Container", type: "text" },
                    { key: "line" as const, label: "Shipping Line", type: "text" },
                    { key: "origin" as const, label: "Origin", type: "text" },
                    { key: "destination" as const, label: "Destination", type: "text" },
                    { key: "etd" as const, label: "ETD", type: "date" },
                    { key: "eta" as const, label: "ETA", type: "date" },
                  ]).map(f => (
                    <div key={f.key}>
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">{f.label}</label>
                      <input
                        type={f.type}
                        className={inputClass}
                        value={detailForm[f.key]}
                        onChange={e => setDetailForm(prev => prev ? { ...prev, [f.key]: e.target.value } : prev)}
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Current Status</label>
                    <select
                      className={inputClass}
                      value={detailForm.milestone}
                      onChange={e => setDetailForm(prev => prev ? { ...prev, milestone: e.target.value } : prev)}
                    >
                      {STATUS_FLOW.map(sf => (
                        <option key={sf.milestone} value={sf.milestone}>{sf.milestone}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={savingDetails}
                    onClick={() => void handleSaveDetails()}
                    className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold text-white transition-opacity disabled:opacity-60 mt-1"
                    style={{ background: EMERALD }}
                  >
                    {savingDetails ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {savingDetails ? "Saving…" : "Save Details"}
                  </button>
                </div>

                {/* Milestone Progress */}
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Shipment Journey</p>
                  <div className="space-y-2">
                    {MILESTONES.map((m, i) => {
                      const activeIdx = getActiveMilestoneIndex(selected)
                      const done = selected.status === "delivered" ? true : i < activeIdx
                      const current = selected.status !== "delivered" && i === activeIdx
                      return (
                        <div key={m} className="flex items-center gap-2.5">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${done ? "" : current ? "border-2" : "border border-border"}`}
                            style={done ? { background: GREEN } : current ? { borderColor: "#0ea5e9", background: "#f0f9ff" } : {}}>
                            {done && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                            {current && <div className="w-2 h-2 rounded-full" style={{ background: "#0ea5e9" }} />}
                          </div>
                          <span className={`text-[11px] ${done ? "text-foreground font-medium" : current ? "font-semibold" : "text-muted-foreground"}`}
                            style={current ? { color: "#0ea5e9" } : {}}>
                            {m}
                            {current && <span className="ml-1.5 text-[9px] uppercase tracking-wide opacity-80">(Active)</span>}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Shipping Documents */}
                <div
                  ref={docsSectionRef}
                  className={`pt-2 border-t border-border ${focusDocs ? "rounded-lg p-2 ring-2 ring-[#0F3D2E]/40" : ""}`}
                >
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">Shipping Documents</p>
                  <TradeDocumentTypeChecklist
                    documents={selected.documents || []}
                    uploadingType={uploadingType}
                    onUpload={(type, file) => void handleUpload(type, file)}
                    onView={handleViewDoc}
                    onDownload={handleDownloadDoc}
                    onDelete={(doc) => void handleDeleteDoc(doc)}
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[300px] text-center p-8">
                <div>
                  <Ship className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Select a shipment to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-bold text-base">Create Shipment</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Buyer *</label>
                <select
                  className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm"
                  value={createForm.buyer_id}
                  onChange={e => setCreateForm(f => ({ ...f, buyer_id: e.target.value }))}
                >
                  <option value="">Select buyer…</option>
                  {buyers.map(b => (
                    <option key={b.id} value={b.id}>{b.fullName || b.email} (#{b.id})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Order ID (optional)</label>
                <input className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm" value={createForm.order_id}
                  onChange={e => setCreateForm(f => ({ ...f, order_id: e.target.value }))} placeholder="Numeric order id" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Product</label>
                <input className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm" value={createForm.product_snapshot}
                  onChange={e => setCreateForm(f => ({ ...f, product_snapshot: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Container</label>
                  <input className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm" value={createForm.container}
                    onChange={e => setCreateForm(f => ({ ...f, container: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Vessel</label>
                  <input className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm" value={createForm.vessel}
                    onChange={e => setCreateForm(f => ({ ...f, vessel: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Shipping Line</label>
                <input className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm" value={createForm.shipping_line}
                  onChange={e => setCreateForm(f => ({ ...f, shipping_line: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Origin</label>
                  <input className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm" value={createForm.origin}
                    onChange={e => setCreateForm(f => ({ ...f, origin: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Destination</label>
                  <input className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm" value={createForm.destination}
                    onChange={e => setCreateForm(f => ({ ...f, destination: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">ETD</label>
                  <input type="date" className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm" value={createForm.etd}
                    onChange={e => setCreateForm(f => ({ ...f, etd: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">ETA</label>
                  <input type="date" className="w-full mt-1 h-10 px-3 rounded-lg border border-border text-sm" value={createForm.eta}
                    onChange={e => setCreateForm(f => ({ ...f, eta: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" className="px-4 py-2 text-sm rounded-lg border" onClick={() => setShowCreate(false)}>Cancel</button>
              <button type="button" className="px-4 py-2 text-sm rounded-lg text-white inline-flex items-center gap-2" style={{ background: EMERALD }}
                disabled={creating} onClick={handleCreateShipment}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <PaymentDetailsDialog
        open={showPayments}
        onOpenChange={setShowPayments}
        info={paymentInfo}
      />

      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </AdminLayout>
  )
}
