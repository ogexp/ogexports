import { useEffect, useRef, useState } from "react"
import { useLocation } from "wouter"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { DatePicker } from "@/components/ui/date-picker"
import {
  ClipboardList, Plus, Clock, CheckCircle2, XCircle, FileText,
  Eye, Search, Upload, Calendar, Package,
  MapPin, Send, RotateCcw, ArrowLeft, X,
} from "lucide-react"
import { useProducts } from "@workspace/api-client-react"
import { api, unwrapPage, resolveAttachmentUrl, isImageMime } from "@/lib/api"
import { notify } from "@/lib/notify"
import { useCountries, usePorts, useIncoterms } from "@/hooks/useLocations"
import { countryDisplayName } from "@/lib/country-names"

interface RfqAttachmentView {
  id?: number
  path: string
  original_name?: string | null
  mime?: string | null
  size?: number | null
  url?: string | null
  is_image?: boolean
}

interface PendingFile {
  key: string
  file: File
  previewUrl?: string
}

interface RfqRow {
  rawId: number
  id: string
  date: string
  product: string
  productId: string
  qty: string
  packaging: string
  destination: string
  countryId: string
  portId: string
  incoterm: string
  paymentTerms: string
  notes: string
  status: "Pending" | "Quoted" | "Accepted" | "Expired"
  quotesReceived: number
  quotesExpected: number
  deadline: string
  attachments: RfqAttachmentView[]
}

const STATUS_META: Record<string, { label: string; cls: string; icon: React.ElementType }> = {
  Pending:  { label: "Pending",       cls: "bg-amber-500/15 text-amber-600",     icon: Clock        },
  Quoted:   { label: "Quoted",        cls: "bg-blue-500/15 text-blue-600",       icon: FileText     },
  Accepted: { label: "Accepted",      cls: "bg-emerald-500/15 text-emerald-600", icon: CheckCircle2 },
  Expired:  { label: "Expired",       cls: "bg-muted text-muted-foreground",     icon: XCircle      },
}

const PAYMENT_TERMS = ["LC at Sight", "100% Advance TT", "30% Advance + 70% BL", "SBLC"]
const MAX_RFQ_FILES = 5
const ACCEPT_RFQ_FILES = "image/*,.pdf,.doc,.docx,.xls,.xlsx"

function mapRfq(row: any): RfqRow {
  const quotesReceived = row.quotations?.length ?? 0
  return {
    rawId: Number(row.id),
    id: `RFQ-${String(row.id).padStart(6, "0")}`,
    date: row.submitted_at
      ? new Date(row.submitted_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
      : "—",
    product: row.product?.name || row.product_name || "Product",
    productId: row.product_id ? String(row.product_id) : "",
    qty: row.qty || "—",
    packaging: row.packaging || "—",
    destination: row.destination
      || [row.port?.name, countryDisplayName(row.country?.code, row.country?.name)].filter(Boolean).join(", ")
      || "—",
    countryId: row.country_id ? String(row.country_id) : "",
    portId: row.port_id ? String(row.port_id) : "",
    incoterm: row.incoterm || "—",
    paymentTerms: row.payment_terms || "—",
    notes: row.notes || "",
    status: mapStatusLabel(row.status, quotesReceived),
    quotesReceived,
    quotesExpected: 1,
    deadline: row.required_delivery_date || "TBD",
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
  }
}

function mapStatusLabel(raw: string, quoteCount = 0): RfqRow["status"] {
  const s = String(raw || "pending").toLowerCase()
  if (s === "accepted" || s === "converted") return "Accepted"
  if (s === "expired") return "Expired"
  if (s === "quoted" || quoteCount > 0) return "Quoted"
  return "Pending"
}

function attachmentIsImage(a: RfqAttachmentView): boolean {
  return a.is_image === true || isImageMime(a.mime, a.original_name || a.path)
}

export default function BuyerRFQ() {
  const [location, setLocation] = useLocation()
  const queryClient = useQueryClient()
  const { data: productPage, isLoading: productsLoading } = useProducts({ per_page: 100 })
  const products = productPage?.data || []
  const { data: countries = [], isLoading: countriesLoading, isError: countriesError } = useCountries()
  const { data: incoterms = [], isLoading: incotermsLoading } = useIncoterms()
  const [mode, setMode] = useState<"list" | "new">("list")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("All")
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [detailId, setDetailId] = useState<number | null>(null)

  // Form fields
  const [fProductId, setFProductId] = useState("")
  const [fQty, setFQty] = useState("")
  const [fPackaging, setFPackaging] = useState("25 kg PP Bag")
  const [fDestCountry, setFDestCountry] = useState("")
  const [fDestPort, setFDestPort] = useState("")
  const [fIncoterm, setFIncoterm] = useState("")
  const [fPayment, setFPayment] = useState("")
  const [fDelivery, setFDelivery] = useState("")
  const [fNotes, setFNotes] = useState("")
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: ports = [], isLoading: portsLoading, isError: portsError } = usePorts(fDestCountry)
  const destinationCountries = countries.filter((c) => (c.ports_count ?? 0) > 0)
  const { data: rfqPayload, isLoading: rfqsLoading } = useQuery({
    queryKey: ["buyer", "rfqs"],
    queryFn: () => api.get("/api/buyer/rfqs", { per_page: 100 }),
  })
  const rfqs = unwrapPage<any>(rfqPayload).data.map(mapRfq)

  useEffect(() => {
    const path = location.split("?")[0]
    const params = new URLSearchParams(window.location.search)
    const productId = params.get("product_id") || ""
    const openNew = path === "/buyer/rfq/new" || Boolean(productId)
    if (openNew) setMode("new")
    if (productId) setFProductId(productId)
  }, [location])

  const { data: detailPayload, isLoading: detailLoading } = useQuery({
    queryKey: ["buyer", "rfqs", detailId],
    queryFn: () => api.get<{ data: any }>(`/api/buyer/rfqs/${detailId}`),
    enabled: detailId != null,
  })
  const detail = detailPayload?.data ?? null
  const detailStatus = detail
    ? mapStatusLabel(detail.status, detail.quotations?.length ?? 0)
    : "Pending"
  const detailMeta = STATUS_META[detailStatus]

  const filtered = rfqs.filter(r => {
    const matchSearch = r.id.toLowerCase().includes(search.toLowerCase()) || r.product.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === "All" || r.status === statusFilter
    return matchSearch && matchStatus
  })

  function handleResubmit(r: RfqRow) {
    const qtyOnly = String(r.qty).replace(/\s*MT\s*/i, "").trim()
    setFProductId(r.productId)
    setFQty(qtyOnly === "—" ? "" : qtyOnly)
    setFPackaging(r.packaging !== "—" ? r.packaging : "25 kg PP Bag")
    setFDestCountry(r.countryId)
    setFDestPort(r.portId)
    setFIncoterm(r.incoterm !== "—" ? r.incoterm : "")
    setFPayment(r.paymentTerms !== "—" ? r.paymentTerms : "")
    setFDelivery(r.deadline !== "TBD" ? String(r.deadline).slice(0, 10) : "")
    setFNotes(r.notes)
    setPendingFiles([])
    setSubmittedId(null)
    setMode("new")
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList)
    if (!incoming.length) return

    setPendingFiles((prev) => {
      const room = MAX_RFQ_FILES - prev.length
      if (room <= 0) {
        notify.error(`You can attach up to ${MAX_RFQ_FILES} files`)
        return prev
      }
      const next = incoming.slice(0, room).map((file) => ({
        key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      }))
      if (incoming.length > room) {
        notify.error(`Only ${MAX_RFQ_FILES} files allowed — extra files were skipped`)
      }
      return [...prev, ...next]
    })
  }

  function removePendingFile(key: string) {
    setPendingFiles((prev) => {
      const target = prev.find((f) => f.key === key)
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((f) => f.key !== key)
    })
  }

  async function uploadPendingFiles(): Promise<Array<{ path: string; original_name: string; mime: string; size: number }>> {
    const uploaded: Array<{ path: string; original_name: string; mime: string; size: number }> = []
    for (const item of pendingFiles) {
      const fd = new FormData()
      fd.append("file", item.file)
      fd.append("folder", "rfq-attachments")
      const up = await api.upload<{
        data: { path: string; name?: string; mime?: string; size?: number }
      }>("/api/uploads", fd)
      const path = up?.data?.path
      if (!path) throw new Error(`Failed to upload ${item.file.name}`)
      uploaded.push({
        path,
        original_name: up.data.name || item.file.name,
        mime: up.data.mime || item.file.type,
        size: up.data.size ?? item.file.size,
      })
    }
    return uploaded
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qtyMT = parseFloat(fQty)
    if (!isFinite(qtyMT) || qtyMT <= 0) {
      notify.error("Please enter a valid quantity in MT (greater than 0)")
      return
    }

    const selectedProduct = products.find((product: any) => String(product.id) === fProductId)
    if (!selectedProduct) {
      notify.error("Please select a valid product")
      return
    }

    if (!fDestCountry || !fDestPort) {
      notify.error("Please select destination country and port")
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const delivery = fDelivery ? new Date(`${fDelivery}T00:00:00`) : null
    if (!delivery || Number.isNaN(delivery.getTime()) || delivery <= today) {
      notify.error("Required delivery date must be after today")
      return
    }

    setSubmitting(true)
    try {
      const attachments = pendingFiles.length ? await uploadPendingFiles() : []
      const response = await api.post<{ data: { id: number } }>("/api/buyer/rfqs", {
        product_id: Number(fProductId),
        product_name: selectedProduct.name,
        qty: `${fQty} MT`,
        packaging: fPackaging,
        country_id: Number(fDestCountry),
        port_id: Number(fDestPort),
        incoterm: fIncoterm,
        payment_terms: fPayment,
        required_delivery_date: fDelivery,
        notes: fNotes || undefined,
        attachments: attachments.length ? attachments : undefined,
      })

      await queryClient.invalidateQueries({ queryKey: ["buyer", "rfqs"] })
      setSubmittedId(`RFQ-${String(response.data.id).padStart(6, "0")}`)
      setFProductId(""); setFQty(""); setFDestCountry(""); setFDestPort("")
      setFIncoterm(""); setFPayment(""); setFDelivery(""); setFNotes("")
      pendingFiles.forEach((f) => { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl) })
      setPendingFiles([])
      notify.success("RFQ saved successfully")
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "Unable to save RFQ")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <BuyerPortalLayout title="Request for Quotation" subtitle="Create, track and manage all your RFQs">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total RFQs",  value: rfqs.length.toString(),                                      icon: ClipboardList, cls: "text-accent bg-accent/15"         },
            { label: "Pending",     value: rfqs.filter(r => r.status === "Pending").length.toString(),  icon: Clock,        cls: "text-amber-500 bg-amber-500/15"    },
            { label: "Quoted",      value: rfqs.filter(r => r.status === "Quoted").length.toString(),   icon: FileText,     cls: "text-blue-500 bg-blue-500/15"      },
            { label: "Accepted",    value: rfqs.filter(r => r.status === "Accepted").length.toString(), icon: CheckCircle2, cls: "text-emerald-500 bg-emerald-500/15" },
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

        {/* Mode toggle */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl">
            <button onClick={() => setMode("list")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "list" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <ClipboardList className="w-4 h-4 inline mr-1.5" />RFQ History
            </button>
            <button onClick={() => setMode("new")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${mode === "new" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Plus className="w-4 h-4 inline mr-1.5" />New RFQ
            </button>
          </div>
          {mode === "list" && (
            <div className="flex gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search RFQs..." className="pl-9 h-9 text-sm w-52" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="px-3 py-1.5 rounded-lg text-sm bg-background border border-border focus:outline-none" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option>All</option>
                <option>Pending</option>
                <option>Quoted</option>
                <option>Accepted</option>
                <option>Expired</option>
              </select>
            </div>
          )}
        </div>

        {/* RFQ List */}
        {mode === "list" && (
          <div className="space-y-3">
            {rfqsLoading && (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Loading RFQ history...
              </div>
            )}
            {filtered.map(r => {
              const meta = STATUS_META[r.status]
              return (
                <Card key={r.id} className="glass-card hover:border-accent/30 transition-all">
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">{r.id}</span>
                          <Badge className={`text-[10px] border-0 ${meta.cls}`}>
                            <meta.icon className="w-3 h-3 mr-1" />{meta.label}
                          </Badge>
                          {r.status === "Quoted" && (
                            <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[10px]">{r.quotesReceived} quote{r.quotesReceived !== 1 ? "s" : ""} received</Badge>
                          )}
                        </div>
                        <p className="text-sm font-bold">{r.product}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Package className="w-3 h-3" />{r.qty}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{r.destination}</span>
                          <span>{r.incoterm}</span>
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Submitted {r.date}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {r.status === "Quoted" && (
                          <Button
                            size="sm"
                            className="text-xs"
                            style={{ background: "#D4A012", color: "#1F2933" }}
                            onClick={() => setLocation(`/buyer/quotations?rfq=${r.rawId}`)}
                          >
                            View Quotes
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="text-xs" onClick={() => setDetailId(r.rawId)}>
                          <Eye className="w-3.5 h-3.5 mr-1" /> Detail
                        </Button>
                        {r.status === "Expired" && (
                          <Button size="sm" variant="outline" className="text-xs" onClick={() => handleResubmit(r)}>
                            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Resubmit
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
            {!rfqsLoading && filtered.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                <ClipboardList className="w-10 h-10 mx-auto mb-4 opacity-40" />
                <p className="text-sm">No RFQs found.</p>
              </div>
            )}
          </div>
        )}

        {/* New RFQ Form */}
        {mode === "new" && (
          <Card className="glass-card">
            <CardHeader className="pb-4">
              <CardTitle className="font-heading text-base flex items-center gap-2">
                <Plus className="w-4 h-4 text-accent" /> Create New RFQ
              </CardTitle>
              <p className="text-xs text-muted-foreground">Fields marked * are required</p>
            </CardHeader>
            <CardContent>
              {submittedId ? (
                <div className="py-12 text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "#f0fdf4" }}>
                    <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h3 className="font-heading font-bold text-lg mb-1">RFQ Submitted!</h3>
                  <p className="text-sm text-muted-foreground mb-1">Reference: <span className="font-mono font-bold">{submittedId}</span></p>
                  <p className="text-sm text-muted-foreground mb-6 mt-3">
                    Your request is saved and has been sent to our trade desk. The quotation will appear in your Quotations page when it is ready.
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <Button variant="outline" onClick={() => { setSubmittedId(null); setMode("list") }}>
                      <ArrowLeft className="w-4 h-4 mr-2" /> View RFQ History
                    </Button>
                    <Button variant="outline" onClick={() => setSubmittedId(null)}>
                      <Plus className="w-4 h-4 mr-2" /> New RFQ
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Product *</Label>
                      <SearchableSelect
                        required
                        value={fProductId}
                        onChange={setFProductId}
                        placeholder={productsLoading ? "Loading products..." : "Select product"}
                        searchPlaceholder="Search product…"
                        emptyText="No product found."
                        options={products.map((product: any) => ({
                          value: String(product.id),
                          label: product.name,
                        }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Quantity (MT) *</Label>
                      <Input placeholder="e.g. 25" required value={fQty} onChange={e => setFQty(e.target.value)} className="h-10 text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Packaging</Label>
                      <SearchableSelect
                        value={fPackaging}
                        onChange={setFPackaging}
                        placeholder="Select packaging"
                        options={[
                          { value: "25 kg PP Bag", label: "25 kg PP Bag" },
                          { value: "50 kg Jute Bag", label: "50 kg Jute Bag" },
                          { value: "1 MT Jumbo Bag", label: "1 MT Jumbo Bag" },
                          { value: "Bulk", label: "Bulk" },
                          { value: "Other (specify in notes)", label: "Other (specify in notes)" },
                        ]}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Destination Country *</Label>
                      <SearchableSelect
                        required
                        showSearch
                        value={fDestCountry}
                        onChange={(v) => { setFDestCountry(v); setFDestPort("") }}
                        placeholder={countriesLoading ? "Loading countries..." : "Select country"}
                        searchPlaceholder="Search country…"
                        emptyText="No country found."
                        emptyLimit={destinationCountries.length}
                        options={destinationCountries.map((country) => ({
                          value: String(country.id),
                          label: country.label,
                          keywords: country.searchTerms,
                        }))}
                      />
                      {countriesError && <p className="text-xs text-red-500">Unable to load countries. Please refresh.</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Destination Port *</Label>
                      <SearchableSelect
                        required
                        showSearch
                        disabled={!fDestCountry || portsLoading}
                        value={fDestPort}
                        onChange={setFDestPort}
                        placeholder={
                          !fDestCountry
                            ? "Select country first"
                            : portsLoading
                              ? "Loading ports..."
                              : ports.length
                                ? "Select port"
                                : "No maritime ports found"
                        }
                        searchPlaceholder="Search port…"
                        emptyText="No port found."
                        options={ports.map((port) => ({
                          value: String(port.id),
                          label: `${port.name} (${port.unlocode})`,
                          keywords: port.unlocode,
                        }))}
                      />
                      {portsError && <p className="text-xs text-red-500">Unable to load ports. Please try another country.</p>}
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Preferred Incoterms *</Label>
                      <SearchableSelect
                        required
                        disabled={incotermsLoading}
                        value={fIncoterm}
                        onChange={setFIncoterm}
                        placeholder={incotermsLoading ? "Loading incoterms…" : "Select incoterm"}
                        options={incoterms.map(t => ({
                          value: t.code,
                          label: t.label ? `${t.code} — ${t.label}` : t.code,
                          keywords: t.code,
                        }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Preferred Payment Terms *</Label>
                      <SearchableSelect
                        required
                        value={fPayment}
                        onChange={setFPayment}
                        placeholder="Select payment terms"
                        options={PAYMENT_TERMS.map(t => ({ value: t, label: t }))}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs uppercase tracking-widest text-muted-foreground">Required Delivery Date *</Label>
                      <DatePicker
                        required
                        value={fDelivery}
                        onChange={setFDelivery}
                        placeholder="Select delivery date"
                      />
                      <p className="text-[11px] text-muted-foreground">Must be a future date (after today).</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Special Instructions / Requirements</Label>
                    <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} className="w-full px-3 py-2.5 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-accent resize-none" rows={3} placeholder="Quality specifications, certifications required, labeling requirements, etc." />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-widest text-muted-foreground">Attach Requirement Files</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept={ACCEPT_RFQ_FILES}
                      multiple
                      onChange={(e) => {
                        if (e.target.files) addFiles(e.target.files)
                        e.target.value = ""
                      }}
                    />
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => fileInputRef.current?.click()}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click() }}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragOver(false)
                        if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
                      }}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
                        dragOver ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"
                      }`}
                    >
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Drop files here or <span className="text-accent underline">browse</span></p>
                      <p className="text-xs text-muted-foreground mt-1">Images, PDF, XLSX, DOCX up to 10 MB each (max {MAX_RFQ_FILES})</p>
                    </div>
                    {pendingFiles.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                        {pendingFiles.map((item) => (
                          <div key={item.key} className="relative rounded-lg border border-border bg-muted/20 p-2 flex items-center gap-2">
                            {item.previewUrl ? (
                              <img src={item.previewUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <p className="text-xs truncate flex-1">{item.file.name}</p>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-muted"
                              onClick={(e) => { e.stopPropagation(); removePendingFile(item.key) }}
                              aria-label={`Remove ${item.file.name}`}
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button type="button" variant="outline" onClick={() => setMode("list")}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>
                      <Send className="w-4 h-4 mr-2" /> {submitting ? "Saving..." : "Submit RFQ"}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={detailId != null} onOpenChange={(open) => { if (!open) setDetailId(null) }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">
              RFQ Details{detail ? ` · RFQ-${String(detail.id).padStart(6, "0")}` : ""}
            </DialogTitle>
            <DialogDescription>Full submission details from your RFQ history.</DialogDescription>
          </DialogHeader>
          {detailLoading && (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading RFQ details…</p>
          )}
          {!detailLoading && detail && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={`text-[10px] border-0 ${detailMeta.cls}`}>
                  <detailMeta.icon className="w-3 h-3 mr-1" />{detailMeta.label}
                </Badge>
                {(detail.quotations?.length ?? 0) > 0 && (
                  <Badge className="bg-blue-500/10 text-blue-600 border-0 text-[10px]">
                    {detail.quotations.length} quote{detail.quotations.length !== 1 ? "s" : ""} received
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Product", value: detail.product?.name || detail.product_name || "—" },
                  { label: "Quantity", value: detail.qty || "—" },
                  { label: "Packaging", value: detail.packaging || "—" },
                  {
                    label: "Destination",
                    value: detail.destination
                      || [detail.port?.name, countryDisplayName(detail.country?.code, detail.country?.name)].filter(Boolean).join(", ")
                      || "—",
                  },
                  { label: "Port", value: detail.port ? `${detail.port.name} (${detail.port.unlocode})` : "—" },
                  { label: "Country", value: countryDisplayName(detail.country?.code, detail.country?.name) || "—" },
                  { label: "Incoterm", value: detail.incoterm || "—" },
                  { label: "Payment Terms", value: detail.payment_terms || "—" },
                  { label: "Required Delivery", value: detail.required_delivery_date || "—" },
                  {
                    label: "Submitted",
                    value: detail.submitted_at
                      ? new Date(detail.submitted_at).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
                      : "—",
                  },
                ].map((row) => (
                  <div key={row.label} className="space-y-0.5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{row.label}</p>
                    <p className="font-medium text-foreground">{row.value}</p>
                  </div>
                ))}
              </div>
              {detail.notes && (
                <div className="p-3 rounded-xl bg-muted/30 text-sm">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Notes</p>
                  <p className="text-muted-foreground leading-relaxed">{detail.notes}</p>
                </div>
              )}
              {Array.isArray(detail.attachments) && detail.attachments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Attachments</p>
                  <div className="grid grid-cols-2 gap-2">
                    {detail.attachments.map((a: RfqAttachmentView) => {
                      const url = resolveAttachmentUrl(a.path, a.url)
                      const image = attachmentIsImage(a)
                      return (
                        <a
                          key={a.id ?? a.path}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg border border-border overflow-hidden hover:border-accent/50 transition-colors"
                        >
                          {image ? (
                            <img src={url} alt={a.original_name || "Attachment"} className="w-full h-28 object-cover" />
                          ) : (
                            <div className="h-28 flex flex-col items-center justify-center gap-1 bg-muted/30 p-2">
                              <FileText className="w-6 h-6 text-muted-foreground" />
                              <span className="text-[11px] text-center truncate w-full px-1">{a.original_name || "Document"}</span>
                            </div>
                          )}
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}
              {(detail.quotations?.length ?? 0) > 0 && (
                <Button
                  className="w-full text-sm"
                  style={{ background: "#D4A012", color: "#1F2933" }}
                  onClick={() => {
                    setDetailId(null)
                    setLocation(`/buyer/quotations?rfq=${detail.id}`)
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" /> View Quotes
                </Button>
              )}
            </div>
          )}
          {!detailLoading && !detail && (
            <p className="text-sm text-muted-foreground py-6 text-center">Unable to load this RFQ.</p>
          )}
        </DialogContent>
      </Dialog>
    </BuyerPortalLayout>
  )
}
