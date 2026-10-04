import { useEffect, useState } from "react"
import { Link, useParams } from "wouter"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { ArrowLeft, Film, ImageIcon, Package, AlertCircle } from "lucide-react"
import { fetchSupplierOfferById, type SupplierOffer } from "@/lib/admin-data"
import { resolveMediaUrl } from "@/lib/api"

export default function AdminOfferDocs() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const [offer, setOffer] = useState<SupplierOffer | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!id) {
        setLoading(false)
        setError("Missing offer id")
        return
      }
      setLoading(true)
      setError(null)
      try {
        const data = await fetchSupplierOfferById(id)
        if (!cancelled) {
          setOffer(data)
          if (!data) setError("Offer not found or you do not have permission to view it.")
        }
      } catch (e: any) {
        if (!cancelled) {
          setOffer(null)
          setError(e?.message || "Unable to load offer documents.")
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const images = offer?.images || []
  const video = offer?.video

  return (
    <AdminLayout
      title="Offer Documents"
      subtitle={offer ? `${offer.productName} · ${offer.supplierName}` : "Supplier uploaded images and video"}
    >
      <div className="mb-4">
        <Link href="/admin/suppliers" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Back to Supplier Offer Center
        </Link>
      </div>

      {loading ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center text-muted-foreground text-sm">
          Loading documents…
        </div>
      ) : error || !offer ? (
        <div className="rounded-xl border border-border bg-card p-16 text-center text-muted-foreground">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-foreground mb-1">{error || "Offer not found"}</p>
          <p className="text-xs flex items-center justify-center gap-1.5 mt-2">
            <AlertCircle className="w-3.5 h-3.5" />
            Check that the offer exists and media was uploaded by the supplier.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-heading font-bold text-lg">{offer.productName}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {offer.supplierName} · {offer.supplierCountry} · Offer #{offer.id}
                </p>
              </div>
              <div className="text-xs text-muted-foreground">
                Submitted {offer.submittedAt}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <ImageIcon className="w-4 h-4" /> Product Images ({images.length})
            </h3>
            {images.length === 0 ? (
              <p className="text-sm text-muted-foreground">No images uploaded for this offer.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((src, i) => {
                  const url = resolveMediaUrl(src)
                  return (
                    <a
                      key={`${src}-${i}`}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="group aspect-square rounded-xl overflow-hidden border border-border bg-muted"
                    >
                      <img
                        src={url}
                        alt={`${offer.productName} ${i + 1}`}
                        className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform"
                        onError={(e) => {
                          const el = e.currentTarget
                          el.style.opacity = "0.4"
                          el.alt = "Failed to load image"
                        }}
                      />
                    </a>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
              <Film className="w-4 h-4" /> Product Video
            </h3>
            {!video ? (
              <p className="text-sm text-muted-foreground">No video uploaded for this offer.</p>
            ) : (
              <video
                src={resolveMediaUrl(video)}
                controls
                className="w-full max-h-[480px] rounded-xl bg-black border border-border"
              />
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
