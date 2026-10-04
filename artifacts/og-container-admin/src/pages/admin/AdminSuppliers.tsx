import { useCallback, useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import { AdminLayout } from "@/components/admin/AdminLayout"
import {
  Search, CheckCircle2, XCircle, Clock, Eye, Star,
  Package, BarChart3, Award, FileText, ThumbsUp, ThumbsDown,
  Pause, RefreshCw, Globe, Shield, ImageIcon, FolderOpen,
  ChevronLeft, ChevronRight, Film
} from "lucide-react"
import {
  refreshSupplierOffers,
  fetchSupplierOfferStats,
  updateSupplierOffer,
  addOfferNote,
  rateOffer,
  getSupplierOffers,
  type SupplierOffer,
  type SupplierOfferStats,
} from "@/lib/admin-data"
import { resolveMediaUrl } from "@/lib/api"

const GOLD = "#D4A012"
const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"

const STATUS_CONFIG: Record<string, { bg: string; color: string; label: string; icon: React.ElementType }> = {
  pending:  { bg: "#fffbeb", color: "#f59e0b", label: "Pending Review", icon: Clock },
  approved: { bg: "#f0fdf4", color: GREEN,     label: "Approved",       icon: CheckCircle2 },
  rejected: { bg: "#fef2f2", color: "#ef4444", label: "Rejected",       icon: XCircle },
  hold:     { bg: "#eff6ff", color: "#3b82f6", label: "On Hold",        icon: Pause },
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(i)}
        >
          <Star
            className="w-4 h-4 transition-colors"
            fill={(hover || value) >= i ? GOLD : "none"}
            stroke={(hover || value) >= i ? GOLD : "#d1d5db"}
          />
        </button>
      ))}
    </div>
  )
}

function OfferDetailPanel({ offer, onClose, onUpdate }: {
  offer: SupplierOffer
  onClose: () => void
  onUpdate: () => void
}) {
  const [note, setNote] = useState("")
  const [rating, setRating] = useState(offer.rating ?? 0)

  useEffect(() => {
    setRating(offer.rating ?? 0)
  }, [offer.id, offer.rating])

  const handleStatus = (status: SupplierOffer["status"]) => {
    updateSupplierOffer(offer.id, { status })
    onUpdate()
  }

  const handleNote = () => {
    if (!note.trim()) return
    addOfferNote(offer.id, note.trim())
    setNote("")
    onUpdate()
  }

  const handleRating = (v: number) => {
    setRating(v)
    rateOffer(offer.id, v)
    onUpdate()
  }

  const cfg = STATUS_CONFIG[offer.status]
  const hasDocs = Boolean(offer.images?.length || offer.video)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-xl h-screen overflow-y-auto bg-background border-l border-border shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-heading font-bold text-lg">{offer.productName}</h2>
            <p className="text-xs text-muted-foreground">{offer.supplierName} · #{offer.id}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">✕</button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-xl border" style={{ background: cfg.bg + "88", borderColor: cfg.color + "40" }}>
            <cfg.icon className="w-5 h-5 shrink-0" style={{ color: cfg.color }} />
            <div>
              <div className="font-semibold text-sm" style={{ color: cfg.color }}>{cfg.label}</div>
              <div className="text-xs text-muted-foreground">Submitted {offer.submittedAt}</div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Supplier</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-muted-foreground">Name: </span><span className="font-medium">{offer.supplierName}</span></div>
              <div><span className="text-muted-foreground">Country: </span><span className="font-medium">{offer.supplierCountry}</span></div>
              <div><span className="text-muted-foreground">Category: </span><span className="font-medium">{offer.category}</span></div>
              <div><span className="text-muted-foreground">Currency: </span><span className="font-medium">{offer.currency || "—"}</span></div>
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Product Details</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
              {[
                ["Product", offer.productName],
                ["Origin", offer.origin],
                [offer.currency === "PKR" || offer.supplierCountry?.toLowerCase() === "pakistan" ? "Price (DAP / PKR)" : "Price (FOB / USD)", offer.priceFob],
                ["Available Qty", offer.availableQty],
                ["MOQ", offer.moq],
                ["Lead Time", offer.leadTime],
                ["Packaging", offer.packaging],
                ["Payment Terms", offer.paymentTerms],
                ["Offer Valid Until", offer.validUntil || "—"],
                ["HS Code", offer.hsCode || "—"],
              ].map(([label, val]) => (
                <div key={label}>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="font-medium text-foreground mt-0.5">{val}</div>
                </div>
              ))}
            </div>
            {offer.specifications && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Specifications</div>
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{offer.specifications}</p>
              </div>
            )}
            {offer.remarks && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Supplier Remarks</div>
                <p className="text-sm text-foreground bg-muted/50 rounded-lg p-3">{offer.remarks}</p>
              </div>
            )}
          </div>

          {hasDocs && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> Product Docs
                </h3>
                <Link href={`/admin/suppliers/${offer.id}/docs`} className="text-xs font-semibold text-primary hover:underline">
                  Open full docs →
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(offer.images || []).slice(0, 3).map((src, i) => (
                  <div key={i} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                    <img src={resolveMediaUrl(src)} alt={`Product ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              {offer.video && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Film className="w-3.5 h-3.5" /> Video attached
                </div>
              )}
            </div>
          )}

          {offer.certifications?.length > 0 && (
            <div className="rounded-xl border border-border p-4 space-y-3">
              <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Certifications</h3>
              <div className="flex flex-wrap gap-2">
                {offer.certifications.map(c => (
                  <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-medium border border-emerald-500/20">
                    <Award className="w-3 h-3" /> {c}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Admin Rating</h3>
            <StarRating value={rating} onChange={handleRating} />
            <p className="text-[11px] text-muted-foreground">Rating is saved on this offer and updates the supplier average rating.</p>
          </div>

          <div className="rounded-xl border border-border p-4 space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Internal Notes</h3>
            {offer.notes?.length > 0 ? (
              <div className="space-y-2">
                {offer.notes.map((n, i) => (
                  <div key={i} className="text-xs bg-muted/50 rounded-lg p-3 border border-border">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">Admin</span>
                      <span className="text-muted-foreground">{n.at}</span>
                    </div>
                    <p>{n.text}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No notes yet.</p>
            )}
            <div className="flex gap-2">
              <input
                value={note}
                onChange={e => setNote(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleNote()}
                placeholder="Add internal note…"
                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleNote}
                disabled={!note.trim()}
                className="px-3 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
                style={{ background: EMERALD }}
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleStatus("approved")}
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors group"
            >
              <ThumbsUp className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-emerald-700">Approve</span>
            </button>
            <button
              onClick={() => handleStatus("hold")}
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10 transition-colors group"
            >
              <Pause className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-blue-700">Hold</span>
            </button>
            <button
              onClick={() => handleStatus("rejected")}
              className="flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 border-red-500/30 bg-red-500/5 hover:bg-red-500/10 transition-colors group"
            >
              <ThumbsDown className="w-5 h-5 text-red-600 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-semibold text-red-700">Reject</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const EMPTY_STATS: SupplierOfferStats = {
  total: 0, pending: 0, approved: 0, hold: 0, rejected: 0, avg_rating: 0,
}

export default function AdminSuppliers() {
  const [offers, setOffers] = useState<SupplierOffer[]>([])
  const [stats, setStats] = useState<SupplierOfferStats>(EMPTY_STATS)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState<"newest" | "price_asc" | "rating_desc">("newest")
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SupplierOffer | null>(null)
  const [compareMode, setCompareMode] = useState(false)
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set())
  const [categories, setCategories] = useState<string[]>(["all"])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pageRes, statsRes] = await Promise.all([
        refreshSupplierOffers({
          page,
          per_page: 10,
          status: statusFilter,
          category: categoryFilter,
          search,
          sort: sortBy,
          scope: "admin",
        }),
        fetchSupplierOfferStats("admin"),
      ])
      setOffers(pageRes.data)
      setLastPage(pageRes.last_page)
      setTotal(pageRes.total)
      setStats(statsRes)
      setCategories(prev => {
        const fromPage = pageRes.data.map(o => o.category).filter(Boolean)
        return ["all", ...Array.from(new Set([...prev.filter(c => c !== "all"), ...fromPage]))]
      })
    } catch {
      setOffers([])
      setStats(EMPTY_STATS)
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, categoryFilter, search, sortBy])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1)
      setSearch(searchInput.trim())
    }, 350)
    return () => clearTimeout(t)
  }, [searchInput])

  const compareOffers = useMemo(
    () => offers.filter(o => compareIds.has(o.id)),
    [offers, compareIds],
  )

  const toggleCompare = (id: string) => {
    setCompareIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 4) next.add(id)
      return next
    })
  }

  return (
    <AdminLayout title="Supplier Offer Center" subtitle="Internal — review, compare, and manage supplier offers confidentially">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Offers", value: String(stats.total), icon: FileText, color: "#3b82f6", bg: "#eff6ff" },
          { label: "Pending Review", value: String(stats.pending), icon: Clock, color: "#f59e0b", bg: "#fffbeb" },
          { label: "Approved", value: String(stats.approved), icon: CheckCircle2, color: GREEN, bg: "#f0fdf4" },
          { label: "Avg. Supplier Rating", value: `${(stats.avg_rating ?? 0).toFixed(1)} ★`, icon: Star, color: GOLD, bg: "#fefce8" },
        ].map(kpi => (
          <div key={kpi.label} className="bg-card border border-border rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: kpi.bg }}>
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
            </div>
            <div>
              <div className="text-xl font-heading font-bold" style={{ color: kpi.color }}>{kpi.value}</div>
              <div className="text-xs text-muted-foreground">{kpi.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Search product or supplier…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:border-primary"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => { setPage(1); setStatusFilter(e.target.value) }}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="hold">On Hold</option>
          <option value="rejected">Rejected</option>
        </select>

        <select
          value={categoryFilter}
          onChange={e => { setPage(1); setCategoryFilter(e.target.value) }}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary"
        >
          {categories.map(c => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
        </select>

        <select
          value={sortBy}
          onChange={e => { setPage(1); setSortBy(e.target.value as typeof sortBy) }}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:border-primary"
        >
          <option value="newest">Sort: Newest</option>
          <option value="price_asc">Sort: Price Low→High</option>
          <option value="rating_desc">Sort: Rating High→Low</option>
        </select>

        <button
          onClick={() => { setCompareMode(m => !m); setCompareIds(new Set()) }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
            compareMode ? "bg-blue-500 text-white border-blue-500" : "border-border text-muted-foreground hover:bg-muted"
          }`}
        >
          <BarChart3 className="w-4 h-4" /> Compare {compareMode && compareIds.size > 0 ? `(${compareIds.size})` : ""}
        </button>

        <button onClick={() => void load()} className="flex items-center gap-1.5 px-3 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-muted">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {compareMode && compareIds.size >= 2 && (
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-5 overflow-x-auto">
          <h3 className="font-heading font-semibold text-sm mb-4 text-blue-700 dark:text-blue-400 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Comparing {compareIds.size} Offers
          </h3>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-blue-200 dark:border-blue-800">
                <th className="text-left px-3 py-2 font-semibold text-muted-foreground w-32">Field</th>
                {compareOffers.map(o => (
                  <th key={o.id} className="text-left px-3 py-2 font-semibold">{o.supplierName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Product", (o: SupplierOffer) => o.productName],
                ["Price", (o: SupplierOffer) => o.priceFob],
                ["Available Qty", (o: SupplierOffer) => o.availableQty],
                ["MOQ", (o: SupplierOffer) => o.moq],
                ["Lead Time", (o: SupplierOffer) => o.leadTime],
                ["Payment Terms", (o: SupplierOffer) => o.paymentTerms],
                ["Rating", (o: SupplierOffer) => o.rating ? `${o.rating} / 5 ★` : "Unrated"],
                ["Certifications", (o: SupplierOffer) => o.certifications?.join(", ") || "—"],
              ].map(([label, fn]) => (
                <tr key={String(label)} className="border-b border-blue-100 dark:border-blue-900/50">
                  <td className="px-3 py-2 font-semibold text-muted-foreground">{String(label)}</td>
                  {compareOffers.map(o => (
                    <td key={o.id} className="px-3 py-2">{(fn as (o: SupplierOffer) => string)(o)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
          <h3 className="font-heading font-semibold text-sm">{total} Offers</h3>
          <span className="text-xs text-muted-foreground">Confidential — Buyer identities hidden from suppliers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {compareMode && <th className="px-3 py-3 w-10"></th>}
                {["Supplier", "Product", "Category", "Price FOB", "Avail. Qty", "Lead Time", "Certifications", "Rating", "Status", "Submitted", "Actions"].map(h => (
                  <th key={h} className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-muted-foreground text-sm">Loading offers…</td>
                </tr>
              ) : offers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-16 text-muted-foreground text-sm">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    No offers found
                  </td>
                </tr>
              ) : offers.map(offer => {
                const cfg = STATUS_CONFIG[offer.status]
                const hasDocs = Boolean(offer.images?.length || offer.video)
                return (
                  <tr key={offer.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                    {compareMode && (
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={compareIds.has(offer.id)}
                          onChange={() => toggleCompare(offer.id)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-3 py-3">
                      <div className="font-semibold text-sm">{offer.supplierName}</div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5">
                        <Globe className="w-3 h-3" /> {offer.supplierCountry}
                        {offer.supplierVerified && <Shield className="w-3 h-3 text-emerald-500 ml-1" />}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium">{offer.productName}</div>
                      <div className="text-[11px] text-muted-foreground">{offer.origin}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{offer.category}</span>
                    </td>
                    <td className="px-3 py-3 font-bold text-accent">{offer.priceFob}</td>
                    <td className="px-3 py-3">{offer.availableQty}</td>
                    <td className="px-3 py-3">{offer.leadTime}</td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-1">
                        {offer.certifications?.slice(0, 2).map(c => (
                          <span key={c} className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">{c}</span>
                        ))}
                        {(offer.certifications?.length ?? 0) > 2 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">+{offer.certifications.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      {offer.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-xs">{offer.rating}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
                        <cfg.icon className="w-3 h-3" /> {cfg.label}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[11px] text-muted-foreground whitespace-nowrap">{offer.submittedAt}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelected(offer)}
                          className="p-1.5 rounded-lg hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <Link
                          href={`/admin/suppliers/${offer.id}/docs`}
                          className={`p-1.5 rounded-lg border border-border transition-colors ${
                            hasDocs
                              ? "hover:bg-blue-50 text-blue-600"
                              : "hover:bg-muted text-muted-foreground"
                          }`}
                          title="View docs"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => { updateSupplierOffer(offer.id, { status: "approved" }); void load() }}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 border border-border text-muted-foreground hover:text-emerald-600 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { updateSupplierOffer(offer.id, { status: "rejected" }); void load() }}
                          className="p-1.5 rounded-lg hover:bg-red-50 border border-border text-muted-foreground hover:text-red-600 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {lastPage > 1 && (
          <div className="px-5 py-3 border-t border-border flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Page {page} of {lastPage} · 10 per page</p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                disabled={page >= lastPage}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted flex items-center gap-1"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <OfferDetailPanel
          offer={selected}
          onClose={() => { setSelected(null); void load() }}
          onUpdate={async () => {
            await load()
            const latest = getSupplierOffers().find(o => o.id === selected.id)
            if (latest) setSelected(latest)
          }}
        />
      )}
    </AdminLayout>
  )
}
