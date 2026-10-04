import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  ClipboardList, CheckCircle2, Clock, XCircle, PauseCircle,
  MapPin, Shield, ChevronDown, ChevronUp,
  Info, MessageSquare, Star, Lock, ChevronLeft, ChevronRight
} from "lucide-react"
import {
  refreshSupplierOffers,
  fetchSupplierOfferStats,
  type SupplierOffer,
  type SupplierOfferStats,
} from "@/lib/admin-data"
import { useCurrency } from "@/lib/use-currency"
import { resolveMediaUrl } from "@/lib/api"

const STATUS_CONFIG = {
  approved: {
    label: "Approved",
    color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    note: "Your offer has been accepted. Our team will contact you to proceed."
  },
  pending: {
    label: "Under Review",
    color: "bg-amber-500/15 text-amber-600 border-amber-500/30",
    icon: Clock,
    iconColor: "text-amber-500",
    note: "Your offer is currently being reviewed by the OG Exports sourcing team."
  },
  hold: {
    label: "On Hold",
    color: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    icon: PauseCircle,
    iconColor: "text-blue-500",
    note: "Your offer is on hold. Please check the remarks below for details."
  },
  rejected: {
    label: "Not Accepted",
    color: "bg-red-500/15 text-red-600 border-red-500/30",
    icon: XCircle,
    iconColor: "text-red-500",
    note: "Your offer was not accepted at this time. Please review the remarks."
  },
}

function StatusBadge({ status }: { status: SupplierOffer["status"] }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${cfg.color}`}>
      <Icon className={`w-3 h-3 ${cfg.iconColor}`} />
      {cfg.label}
    </span>
  )
}

function StarRating({ rating }: { rating?: number }) {
  if (!rating) return <span className="text-xs text-muted-foreground">Not yet rated</span>
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`w-3.5 h-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
      <span className="text-xs text-muted-foreground ml-1">{rating}/5</span>
    </div>
  )
}

function OfferCard({ offer }: { offer: SupplierOffer }) {
  const [open, setOpen] = useState(false)
  const c = useCurrency()
  const cfg = STATUS_CONFIG[offer.status]
  const StatusIcon = cfg.icon

  const priceLabel = c.isPK || offer.incoterm === "DAP" || offer.currency === "PKR"
    ? `DAP Price · ${c.symLabel}`
    : `FOB Price · ${c.symLabel}`
  const priceDisplay = (() => {
    const raw = String(offer.priceFob || "").trim()
    if (!raw) return "—"
    const numeric = parseFloat(raw.replace(/[^0-9.-]/g, ""))
    if (!Number.isFinite(numeric)) {
      if (/(PKR|USD|\$)/i.test(raw)) return raw
      return raw
    }
    const source = String(offer.currency || (c.isPK ? "PKR" : "USD")).toUpperCase()
    return c.fmtTrade(numeric, { sourceCurrency: source })
  })()

  return (
    <div className="border rounded-xl overflow-hidden bg-card transition-all">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="font-mono text-xs text-muted-foreground">#{offer.id}</span>
            <Badge variant="outline" className="text-xs">{offer.category}</Badge>
            {offer.supplierVerified && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                <Shield className="w-3 h-3" /> Verified
              </span>
            )}
          </div>
          <h3 className="font-semibold text-base leading-snug">{offer.productName}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" /> {offer.origin}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <StatusBadge status={offer.status} />
          <div className="text-xs text-muted-foreground">Submitted {offer.submittedAt}</div>
        </div>
      </div>

      <div className={`px-5 py-3 flex items-start gap-2 text-xs ${
        offer.status === "approved" ? "bg-emerald-500/8 border-t border-emerald-500/15" :
        offer.status === "rejected" ? "bg-red-500/8 border-t border-red-500/15" :
        offer.status === "hold" ? "bg-blue-500/8 border-t border-blue-500/15" :
        "bg-amber-500/8 border-t border-amber-500/15"
      }`}>
        <StatusIcon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.iconColor}`} />
        <span>{cfg.note}</span>
      </div>

      <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t">
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">{priceLabel}</div>
          <div className="text-sm font-bold text-primary">{priceDisplay}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">Available Qty</div>
          <div className="text-sm font-semibold">{offer.availableQty}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">MOQ</div>
          <div className="text-sm font-semibold">{offer.moq}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground mb-0.5">Lead Time</div>
          <div className="text-sm font-semibold">{offer.leadTime}</div>
        </div>
      </div>

      {offer.status === "approved" && (
        <div className="px-5 py-3 border-t flex items-center gap-3">
          <Star className="w-4 h-4 text-amber-400" />
          <span className="text-xs text-muted-foreground">Our rating of your offer:</span>
          <StarRating rating={offer.rating} />
        </div>
      )}

      {offer.notes.length > 0 && (
        <div className="px-5 py-3 border-t bg-muted/30">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <MessageSquare className="w-3.5 h-3.5" /> Remarks from OG Exports
          </div>
          <div className="space-y-2">
            {offer.notes.map((note, i) => (
              <div key={i} className="text-sm rounded-lg bg-background border px-3 py-2">
                <p className="text-sm leading-relaxed">{note.text}</p>
                <p className="text-xs text-muted-foreground mt-1">{note.at}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-t">
        <button
          className="w-full px-5 py-3 flex items-center justify-between text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
          onClick={() => setOpen(!open)}
        >
          <span>Full offer details</span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        {open && (
          <div className="px-5 pb-5 space-y-3 border-t pt-4 bg-muted/20">
            {offer.specifications && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Specifications</div>
                <p className="text-sm">{offer.specifications}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Packaging</div>
                <p className="text-sm">{offer.packaging}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Payment Terms</div>
                <p className="text-sm">{offer.paymentTerms}</p>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Certifications</div>
                <div className="flex flex-wrap gap-1.5">
                  {offer.certifications.map(cert => (
                    <span key={cert} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs">
                      <Shield className="w-3 h-3" /> {cert}
                    </span>
                  ))}
                  {!offer.certifications.length && <span className="text-sm text-muted-foreground">—</span>}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Valid Until</div>
                <p className="text-sm">{offer.validUntil || "—"}</p>
              </div>
            </div>
            {(offer.images?.length || offer.video) && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">Media</div>
                <div className="grid grid-cols-3 gap-2">
                  {(offer.images || []).map((src, i) => (
                    <div key={i} className="aspect-square rounded-lg overflow-hidden border">
                      <img src={resolveMediaUrl(src)} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                {offer.video && (
                  <video src={resolveMediaUrl(offer.video)} controls className="mt-2 w-full max-h-48 rounded-lg bg-black" />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

const EMPTY_STATS: SupplierOfferStats = {
  total: 0, pending: 0, approved: 0, hold: 0, rejected: 0,
}

export function SupplierOffersTab() {
  const [offers, setOffers] = useState<SupplierOffer[]>([])
  const [stats, setStats] = useState<SupplierOfferStats>(EMPTY_STATS)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        const [pageRes, statsRes] = await Promise.all([
          refreshSupplierOffers({ page, per_page: 10, scope: "supplier", sort: "newest" }),
          fetchSupplierOfferStats("supplier"),
        ])
        if (cancelled) return
        setOffers(pageRes.data)
        setLastPage(pageRes.last_page)
        setTotal(pageRes.total)
        setStats(statsRes)
      } catch {
        if (!cancelled) {
          setOffers([])
          setStats(EMPTY_STATS)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [page])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-heading font-bold">My Submitted Offers</h2>
          <p className="text-sm text-muted-foreground mt-1">Track the status of your product offers submitted to OG Exports.</p>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 border rounded-lg px-3 py-2">
          <Lock className="w-3.5 h-3.5" /> Buyer info is confidential
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Approved", count: stats.approved, icon: CheckCircle2, color: "text-emerald-500" },
          { label: "Under Review", count: stats.pending, icon: Clock, color: "text-amber-500" },
          { label: "On Hold", count: stats.hold, icon: PauseCircle, color: "text-blue-500" },
          { label: "Not Accepted", count: stats.rejected, icon: XCircle, color: "text-red-500" },
        ].map(({ label, count, icon: Icon, color }) => (
          <Card key={label} className="bg-card/80">
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`w-5 h-5 ${color}`} />
              <div>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs text-muted-foreground">{label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 px-4 py-3 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-400">
          <strong>Confidentiality policy:</strong> Buyer identities, order volumes, and pricing negotiations are never shared with suppliers. You can only view the status of your own submitted offers.
        </div>
      </div>

      {loading ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground text-sm">Loading offers…</CardContent>
        </Card>
      ) : offers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>No offers submitted yet.</p>
            <p className="text-xs mt-1">Submit your first offer from the Submit New Offer page.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-4">
            {offers.map(offer => <OfferCard key={offer.id} offer={offer} />)}
          </div>
          {lastPage > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Showing page {page} of {lastPage} · {total} offers
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4" /> Prev
                </Button>
                <Button variant="outline" size="sm" disabled={page >= lastPage} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
