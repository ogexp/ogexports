import { useState, useEffect } from "react"
import { useParams, Link } from "wouter"
import { useProduct, useProducts } from "@workspace/api-client-react"
import { API_URL } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { RequestQuoteDialog } from "@/components/RequestQuoteDialog"
import {
  ArrowLeft, ShieldCheck, MapPin, Package, Clock, FileText,
  Globe, Award, ChevronRight, Send, Phone, Mail, CheckCircle2, DollarSign,
  Leaf, Thermometer, BarChart3, Truck, Play, X as XIcon, Download,
} from "lucide-react"

export default function ProductDetail() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug || ""
  const { data: product, isLoading, isError } = useProduct(slug)
  const { data: productsPage } = useProducts({ per_page: 12 })
  const allProducts = productsPage?.data ?? []

  const [activeImg, setActiveImg] = useState(0)
  const [showVideo, setShowVideo] = useState(false)
  const [rfqOpen, setRfqOpen] = useState(false)

  useEffect(() => { setActiveImg(0) }, [slug])

  const allImages = product
    ? [product.imageUrl, ...(product.galleryUrls?.filter((u: string) => u !== product.imageUrl) ?? [])].filter(Boolean)
    : []

  const hasLabReport = Boolean(
    product?.hasLabReport
    || product?.labReportPath
    || product?.labReportUrl
  )
  const labReportDownloadUrl = hasLabReport && slug
    ? `${API_URL}/api/products/${encodeURIComponent(slug)}/lab-report`
    : ""

  if (isLoading) {
    return <div className="min-h-[50vh] flex items-center justify-center text-muted-foreground">Loading product…</div>
  }

  /* ── Not Found ─────────────────────────────────────────────────── */
  if (!product || isError) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4 gap-6">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Package className="w-9 h-9 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-2xl font-heading font-bold mb-2">Product Not Found</h2>
          <p className="text-muted-foreground">The product you're looking for doesn't exist or has been removed.</p>
        </div>
        <Link href="/products">
          <Button className="gap-2"><ArrowLeft className="w-4 h-4" /> Back to Catalog</Button>
        </Link>
      </div>
    )
  }

  /* ── Page ───────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-background">

      {/* ── Breadcrumb ── */}
      <div className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-30">
        <div className="container px-4 md:px-6 h-14 flex items-center justify-between">
          <Link href="/products" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Catalog
          </Link>
          <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/products" className="hover:text-foreground transition-colors">Products</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-foreground font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      {/* ── Hero Section ── */}
      <div className="container px-4 md:px-6 py-10 md:py-16">
        <div className="grid lg:grid-cols-2 gap-12 xl:gap-20 items-start">

          {/* Left — Image gallery */}
          <div className="space-y-4 lg:sticky lg:top-24">
            {/* Main media display */}
            <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-border bg-muted shadow-lg relative">
              {showVideo && product.videoUrl ? (
                <video
                  key={product.videoUrl}
                  src={product.videoUrl}
                  controls
                  autoPlay
                  className="w-full h-full object-contain bg-black"
                />
              ) : (
                <img
                  src={allImages[activeImg] ?? product.imageUrl}
                  alt={product.name}
                  className="w-full h-full object-cover transition-opacity duration-300"
                />
              )}
              {product.videoUrl && !showVideo && (
                <button
                  onClick={() => setShowVideo(true)}
                  className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/85 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-white" /> Watch Product Video
                </button>
              )}
              {showVideo && (
                <button
                  onClick={() => setShowVideo(false)}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/85 transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5" /> Back to Images
                </button>
              )}
            </div>
            {/* Thumbs + video thumb */}
            {(allImages.length > 1 || product.videoUrl) && (
              <div className="flex gap-3 flex-wrap">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => { setActiveImg(i); setShowVideo(false) }}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      !showVideo && activeImg === i ? "border-accent shadow-md" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                  </button>
                ))}
                {product.videoUrl && (
                  <button
                    onClick={() => setShowVideo(true)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all relative bg-black ${
                      showVideo ? "border-accent shadow-md" : "border-border hover:border-accent/50"
                    }`}
                  >
                    <video src={product.videoUrl} className="w-full h-full object-cover opacity-50" muted preload="metadata" />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <Play className="w-7 h-7 text-white fill-white" />
                      <span className="text-white text-[9px] font-bold mt-0.5 uppercase tracking-wide">Video</span>
                    </div>
                  </button>
                )}
              </div>
            )}
            {/* Trust badges + Download Report */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {labReportDownloadUrl ? (
                <a
                  href={labReportDownloadUrl}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10 text-center transition-colors hover:bg-primary/10 hover:border-primary/20"
                >
                  <Download className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-wide">Download Report</span>
                </a>
              ) : (
                <div
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10 text-center opacity-40 cursor-not-allowed pointer-events-none"
                  title="Report not available"
                >
                  <Download className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-wide">Download Report</span>
                </div>
              )}
              {[
                { icon: Award, label: "Quality Assured" },
                { icon: Leaf, label: "Lab Tested" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <Icon className="w-5 h-5 text-primary" />
                  <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-wide">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Product info */}
          <div className="space-y-8">

            {/* Header */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-accent/15 text-amber-700 dark:text-amber-400 border-0 text-xs font-bold uppercase tracking-wider">
                  {product.category}
                </Badge>
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0 text-xs font-medium gap-1">
                  <ShieldCheck className="w-3 h-3" /> Verified Exporter
                </Badge>
                <Badge className="bg-primary/10 text-primary border-0 text-xs font-medium gap-1">
                  <MapPin className="w-3 h-3" /> {product.origin}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl xl:text-5xl font-heading font-bold leading-tight">
                {product.name}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {product.shortDescription}
              </p>
            </div>

            {/* Key trade info strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { icon: DollarSign, label: "FOB Price", value: product.fobDisplay || "On request" },
                { icon: Package, label: "MOQ", value: product.moq },
                { icon: Clock, label: "Lead Time", value: product.leadTime },
                { icon: FileText, label: "HS Code", value: product.hsCode },
                { icon: Globe, label: "FOB Port", value: "Karachi / Port Qasim" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="p-3 rounded-xl border border-border bg-card space-y-1">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
                  </div>
                  <div className="text-sm font-semibold text-foreground leading-snug">{value}</div>
                </div>
              ))}
            </div>

            {/* CTA card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-semibold text-lg">Request Wholesale Quotation</h3>
                  <ShieldCheck className="w-5 h-5 text-emerald-500" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Get a custom FOB/CIF price, sample availability, and full trade document pack within 1 business day.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    size="lg"
                    className="flex-1 min-w-[160px] gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => setRfqOpen(true)}
                  >
                    <Send className="w-4 h-4" /> Request Quotation
                  </Button>
                  <a href="https://wa.me/923032569000" target="_blank" rel="noopener noreferrer">
                    <Button size="lg" variant="outline" className="gap-2 border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10">
                      <Phone className="w-4 h-4" /> WhatsApp
                    </Button>
                  </a>
                </div>
                <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> No commitment required</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Full COA provided</span>
                  <span className="flex items-center gap-1"><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Sample available</span>
                </div>
              </CardContent>
            </Card>

            {/* Payment & Delivery */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <BarChart3 className="w-4 h-4 text-accent" /> Payment Terms
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.paymentTerms.map((t) => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">{t}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Truck className="w-4 h-4 text-accent" /> Delivery Terms
                </div>
                <div className="flex flex-wrap gap-2">
                  {product.deliveryTerms.map((t) => (
                    <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground font-medium">{t}</span>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ── Specs & Details ── */}
      <div className="border-t border-border bg-muted/20 py-16">
        <div className="container px-4 md:px-6">
          <div className="grid lg:grid-cols-3 gap-10">

            {/* Specifications Table */}
            <div className="lg:col-span-2 space-y-8">
              <div>
                <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-3">
                  <span className="w-1 h-7 rounded-full bg-primary inline-block" />
                  Complete Specifications
                </h2>
                <div className="rounded-2xl border border-border overflow-hidden bg-card">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-primary/5 border-b border-border">
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground w-2/5">Parameter</th>
                        <th className="text-left px-5 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.specs.map((s, i) => (
                        <tr key={i} className={`border-b border-border/60 ${i % 2 === 0 ? "" : "bg-muted/20"}`}>
                          <td className="px-5 py-3.5 text-muted-foreground font-medium">{s.label}</td>
                          <td className="px-5 py-3.5 font-semibold text-foreground">{s.value}</td>
                        </tr>
                      ))}
                      {product.shelfLife && (
                        <tr className="border-b border-border/60 bg-muted/20">
                          <td className="px-5 py-3.5 text-muted-foreground font-medium">Shelf Life</td>
                          <td className="px-5 py-3.5 font-semibold text-foreground">{product.shelfLife}</td>
                        </tr>
                      )}
                      {product.storageInstructions && (
                        <tr>
                          <td className="px-5 py-3.5 text-muted-foreground font-medium flex items-center gap-1.5">
                            <Thermometer className="w-3.5 h-3.5" /> Storage
                          </td>
                          <td className="px-5 py-3.5 font-semibold text-foreground">{product.storageInstructions}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-3">
                  <span className="w-1 h-7 rounded-full bg-accent inline-block" />
                  Product Overview
                </h2>
                <div className="prose prose-sm prose-neutral dark:prose-invert max-w-none">
                  {product.description.split("\n\n").map((para, i) => (
                    <p key={i} className="text-muted-foreground leading-relaxed mb-4">{para}</p>
                  ))}
                </div>
              </div>

              {/* Packaging */}
              <div>
                <h2 className="text-2xl font-heading font-bold mb-6 flex items-center gap-3">
                  <span className="w-1 h-7 rounded-full bg-primary inline-block" />
                  Packaging Options
                </h2>
                <div className="flex flex-wrap gap-3">
                  {product.packagingOptions.map((opt) => (
                    <div key={opt} className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card text-sm font-medium">
                      <Package className="w-4 h-4 text-accent" />
                      {opt}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right sidebar */}
            <div className="space-y-6">

              {/* Certifications */}
              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-heading font-semibold flex items-center gap-2">
                    <Award className="w-4 h-4 text-accent" /> Certifications
                  </h3>
                  <div className="space-y-2">
                    {product.certifications.map((cert) => (
                      <div key={cert} className="flex items-center gap-2.5 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-foreground/80">{cert}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Export Markets */}
              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-heading font-semibold flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" /> Active Export Markets
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {product.exportMarkets.map((market) => (
                      <span key={market} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">{market}</span>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card className="bg-primary text-primary-foreground border-0">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-heading font-semibold text-lg">Talk to Our Trade Desk</h3>
                  <p className="text-primary-foreground/80 text-sm">Available Mon–Sat, 9 AM – 6 PM PKT</p>
                  <div className="space-y-3">
                    <a href="https://wa.me/923032569000" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 text-sm text-primary-foreground/90 hover:text-primary-foreground transition-colors">
                      <Phone className="w-4 h-4" /> +92 303 256 9000
                    </a>
                    <a href="mailto:sales@ogexports.co"
                      className="flex items-center gap-3 text-sm text-primary-foreground/90 hover:text-primary-foreground transition-colors">
                      <Mail className="w-4 h-4" /> sales@ogexports.co
                    </a>
                  </div>
                  <Button
                    variant="secondary"
                    className="w-full bg-white/15 hover:bg-white/25 text-white border-white/20 gap-2"
                    onClick={() => setRfqOpen(true)}
                  >
                    <Send className="w-4 h-4" /> Send Inquiry
                  </Button>
                </CardContent>
              </Card>

              {/* Related products */}
              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-heading font-semibold text-sm uppercase tracking-wider text-muted-foreground">More Products</h3>
                  <div className="space-y-3">
                    {allProducts.filter((p) => p.slug !== slug).slice(0, 4).map((p) => (
                      <Link key={p.id} href={`/products/${p.slug}`}>
                        <div className="flex items-center gap-3 group cursor-pointer py-1">
                          <div className="w-10 h-10 rounded-lg overflow-hidden border border-border shrink-0">
                            <img src={p.imageUrl} alt={p.name} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">{p.name}</div>
                            <div className="text-xs text-muted-foreground">{p.category}</div>
                            {p.fobDisplay && (
                              <div className="text-xs font-semibold text-accent truncate">{p.fobDisplay}</div>
                            )}
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors ml-auto shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* ── RFQ Dialog ── */}
      <RequestQuoteDialog
        open={rfqOpen}
        onOpenChange={setRfqOpen}
        product={product ? { id: product.id, name: product.name, slug } : null}
      />

    </div>
  )
}
