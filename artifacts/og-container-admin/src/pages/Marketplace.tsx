import { useState } from "react"
import { usePageTitle } from "@/hooks/use-page-title"
import { Link } from "wouter"
import {
  Search, Package, Truck, Warehouse, Phone, Mail,
  CheckCircle2, MapPin, Shield, Tag, Globe,
  ChevronRight, ArrowRight, Users, MessageSquare, ClipboardList,
  BadgeCheck, Zap, FileText, ShoppingCart, X, Building2,
  BarChart3, Star, Info, Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { getImportedProducts, type ImportedProduct } from "@/lib/imported-products-data"

// ─── Category list (derived from data) ────────────────────────────────────────
const ALL_CATEGORIES = [
  "All", "Edible Oils", "Grains & Pulses", "Nuts & Dry Fruits",
  "Dairy & Fats", "Spices & Condiments", "Frozen & Processed", "Sugar & Sweeteners",
]

// ─── Process steps ─────────────────────────────────────────────────────────────
const PROCESS_STEPS = [
  { icon: ClipboardList, title: "Submit Inquiry", desc: "Tell us which product, quantity, and delivery location you need." },
  { icon: MessageSquare, title: "Receive Quote",  desc: "Our team responds with firm pricing and stock availability within 24 hrs." },
  { icon: FileText,     title: "Confirm Order",  desc: "Approve the proforma invoice and confirm your payment terms." },
  { icon: Truck,        title: "Delivery",        desc: "We arrange delivery from our warehouse to your business location across Pakistan." },
]

// ─── Warehouses ───────────────────────────────────────────────────────────────
const WAREHOUSES = [
  { city: "Karachi Hub",       address: "SITE Industrial Area, Karachi",          capacity: "6,000 MT",  temp: "Ambient + Cold Chain" },
  { city: "Lahore Depot",      address: "Quaid-e-Azam Industrial Estate, Lahore", capacity: "2,500 MT",  temp: "Ambient" },
  { city: "Islamabad Depot",   address: "I-9 Industrial Area, Islamabad",         capacity: "1,200 MT",  temp: "Ambient + Chilled" },
]

// ─── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ImportedProduct["status"] }) {
  const cfg = {
    available:     { label: "✓ In Stock",     cls: "bg-emerald-500/90 text-white border-0" },
    limited:       { label: "⚠ Limited Stock", cls: "bg-amber-500/90 text-white border-0" },
    "out-of-stock":{ label: "✗ Out of Stock",  cls: "bg-red-500/90 text-white border-0" },
    "coming-soon": { label: "◎ Coming Soon",   cls: "bg-blue-500/90 text-white border-0" },
  }[status]
  return <Badge className={`text-[10px] font-bold ${cfg.cls}`}>{cfg.label}</Badge>
}

// ─── Video lightbox ────────────────────────────────────────────────────────────
function VideoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
            <Play className="w-3 h-3" /> Product Preview · 20 sec
          </span>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden aspect-video bg-black shadow-2xl">
          <video src={url} controls autoPlay className="w-full h-full" />
        </div>
      </div>
    </div>
  )
}

// ─── Product card ──────────────────────────────────────────────────────────────
function ProductCard({ product, onInquiry, onPlayVideo }: { product: ImportedProduct; onInquiry: (name: string) => void; onPlayVideo: (url: string) => void }) {
  const [imgErr, setImgErr] = useState(false)
  const unavailable = product.status === "out-of-stock"

  return (
    <Card className="group border-border/60 hover:border-accent/40 hover:shadow-xl transition-all overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted shrink-0">
        {product.imageUrl && !imgErr ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-muted-foreground/30" />
          </div>
        )}
        {/* Overlay badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          <StatusBadge status={product.status} />
        </div>
        {product.badge && (
          <div className="absolute top-3 right-3">
            <Badge className="text-[10px] bg-accent/90 text-white border-0">{product.badge}</Badge>
          </div>
        )}
        {/* Country of origin flag overlay */}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-white text-[10px] font-semibold">
            <Globe className="w-3 h-3" />
            {product.countryOfOrigin}
          </div>
        </div>
        {/* Video play button */}
        {product.videoUrl && (
          <button
            onClick={(e) => { e.stopPropagation(); onPlayVideo(product.videoUrl!) }}
            className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-black/65 backdrop-blur-sm text-white text-[10px] font-semibold hover:bg-black/85 transition-colors"
          >
            <Play className="w-3 h-3 fill-white" /> Watch Video
          </button>
        )}
      </div>

      <CardContent className="p-5 space-y-4 flex-1 flex flex-col">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-heading font-semibold text-base group-hover:text-primary transition-colors leading-tight">{product.name}</h3>
            <Badge variant="outline" className="text-[10px] shrink-0">{product.category}</Badge>
          </div>
          {product.specifications && (
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{product.specifications}</p>
          )}
        </div>

        {/* Spec pills */}
        {product.specs.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {product.specs.map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/8 text-primary/80 border border-primary/15 font-medium">
                {s}
              </span>
            ))}
          </div>
        )}

        {/* Trade details grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <div className="text-muted-foreground mb-0.5">Available Stock</div>
            <div className="font-bold text-foreground">{product.availableStock}</div>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <div className="text-muted-foreground mb-0.5">Min. Order</div>
            <div className="font-bold text-foreground">{product.moq}</div>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <div className="text-muted-foreground mb-0.5">Delivery Time</div>
            <div className="font-bold text-foreground">{product.deliveryTime}</div>
          </div>
          <div className="rounded-lg bg-muted/60 px-3 py-2">
            <div className="text-muted-foreground mb-0.5">Packaging</div>
            <div className="font-bold text-foreground truncate">{product.packaging}</div>
          </div>
        </div>

        {/* Price + warehouse */}
        <div className="flex items-center justify-between pt-2 border-t border-border mt-auto">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
              {product.priceVisible ? "Wholesale Price" : "Price on Request"}
            </div>
            {product.priceVisible ? (
              <div className="font-heading font-bold text-accent">{product.wholesalePrice}</div>
            ) : (
              <div className="font-heading font-semibold text-sm text-muted-foreground">Contact Us</div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Warehouse className="w-3 h-3" />
            <span className="truncate max-w-[100px]">{product.warehouseLocation}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm" variant="outline" className="flex-1 text-xs"
            onClick={() => onInquiry(product.name)}
            disabled={unavailable}
          >
            <ClipboardList className="w-3.5 h-3.5 mr-1" /> Get Quote
          </Button>
          <Button
            size="sm" className="flex-1 text-xs gap-1"
            style={{ background: "#0F3D2E", color: "#fff" }}
            onClick={() => onInquiry(product.name)}
            disabled={unavailable}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Order Now
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Inquiry modal ─────────────────────────────────────────────────────────────
function InquiryModal({ product, onClose }: { product: string; onClose: () => void }) {
  const [submitted, setSubmitted] = useState(false)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-2xl border border-border max-w-md w-full p-6 space-y-5"
        onClick={e => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-xl font-heading font-bold mb-2">Inquiry Submitted</h3>
            <p className="text-sm text-muted-foreground">
              Our team will contact you with pricing and availability within 24 hours.
            </p>
            <Button className="mt-6 w-full" style={{ background: "#0F3D2E", color: "#fff" }} onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-heading font-bold">Product Inquiry</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Product: <span className="text-foreground font-medium">{product}</span>
                </p>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-4 py-3 flex items-start gap-2 text-xs text-blue-700 dark:text-blue-400">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              You are purchasing directly from <strong>OG Exports</strong>. No third-party sellers involved.
            </div>
            <div className="space-y-3">
              {[
                { label: "Your Name",        placeholder: "Full name" },
                { label: "Business Name",    placeholder: "Company / trade name" },
                { label: "Contact Number",   placeholder: "+92 XXX XXXXXXX" },
                { label: "City / Location",  placeholder: "Where will you receive the order?" },
                { label: "Quantity Required",placeholder: "e.g. 5 MT, 500 KG" },
              ].map(f => (
                <div key={f.label}>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 block">{f.label}</label>
                  <Input placeholder={f.placeholder} className="text-sm" />
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
              <Button
                className="flex-1 gap-2"
                style={{ background: "#0F3D2E", color: "#fff" }}
                onClick={() => setSubmitted(true)}
              >
                <Mail className="w-4 h-4" /> Submit Inquiry
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function Marketplace() {
  usePageTitle(
    "Imported Products Pakistan",
    "OG Exports' imported product catalog — source premium international goods sold directly by OG Exports to verified Pakistani businesses. Edible oils, grains, nuts, dairy, spices and more."
  )

  const allProducts = getImportedProducts()
  const [activeCategory, setActiveCategory] = useState("All")
  const [search, setSearch] = useState("")
  const [inquiryProduct, setInquiryProduct] = useState<string | null>(null)
  const [videoLightbox, setVideoLightbox] = useState<string | null>(null)

  const filtered = allProducts.filter(p => {
    const matchCat  = activeCategory === "All" || p.category === activeCategory
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.countryOfOrigin.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const inStock = allProducts.filter(p => p.status === "available").length

  return (
    <div className="min-h-screen bg-background">

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        className="relative pt-32 pb-20 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0F3D2E 0%, #1a5c44 60%, #0a2a1e 100%)" }}
      >
        {/* Ambient glows */}
        <div className="absolute inset-0 opacity-8" style={{ backgroundImage: "radial-gradient(circle at 15% 50%, hsl(43 85% 47%) 0%, transparent 45%), radial-gradient(circle at 85% 30%, hsl(43 85% 47%) 0%, transparent 40%)" }} />

        <div className="container px-4 md:px-6 relative">
          <div className="max-w-3xl mx-auto text-center">
            {/* Identity badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 text-xs font-bold tracking-widest uppercase mb-8">
              <Building2 className="w-3.5 h-3.5" />
              OG Exports — Official Importer & Seller
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-tight mb-6">
              Imported Products
              <span className="block" style={{ color: "hsl(43 85% 47%)" }}>for Pakistani Businesses</span>
            </h1>

            <p className="text-lg text-white/70 mb-4 max-w-2xl mx-auto leading-relaxed">
              OG Exports imports premium products from across the world and sells them directly
              to verified Pakistani businesses — no middlemen, no third-party sellers.
            </p>

            {/* Clarity note */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 bg-white/8 text-white/80 text-xs mb-10">
              <Shield className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              Every product on this page is owned, imported, and sold exclusively by OG Exports.
            </div>

            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <Input
                placeholder="Search products or country of origin…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/40 focus:bg-white/15 rounded-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────────────────── */}
      <div className="border-b border-border bg-card/60">
        <div className="container px-4 md:px-6 py-4 flex flex-wrap justify-center gap-10 text-center">
          {[
            [String(allProducts.length), "Imported Products"],
            [String(inStock),            "Currently In Stock"],
            ["15+",                      "Countries Sourced From"],
            ["3",                        "Warehouse Locations"],
            ["24 hrs",                   "Quote Turnaround"],
          ].map(([val, label]) => (
            <div key={label}>
              <div className="text-xl font-heading font-bold text-accent">{val}</div>
              <div className="text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Category filters ──────────────────────────────────────────────────── */}
      <div className="sticky top-[72px] z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container px-4 md:px-6 py-3 flex gap-2 overflow-x-auto scrollbar-none">
          {ALL_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeCategory === cat
                  ? "text-white shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
              style={activeCategory === cat ? { background: "#0F3D2E" } : {}}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* ── Exclusivity notice ────────────────────────────────────────────────── */}
      <div className="container px-4 md:px-6 pt-8">
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-5 py-3 flex items-center gap-3 text-sm">
          <BadgeCheck className="w-5 h-5 text-amber-500 shrink-0" />
          <span>
            <strong className="text-foreground">OG Exports is the exclusive seller</strong>
            <span className="text-muted-foreground ml-1">— all listed products are imported and sold directly by OG Exports. No third-party suppliers or sellers.</span>
          </span>
        </div>
      </div>

      {/* ── Product grid ──────────────────────────────────────────────────────── */}
      <section className="py-8 pb-16">
        <div className="container px-4 md:px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-heading font-bold">Imported Inventory</h2>
              <p className="text-muted-foreground text-sm mt-1">
                {filtered.length} product{filtered.length !== 1 ? "s" : ""} available ·
                <span className="ml-1 text-muted-foreground/70">Sold directly by OG Exports</span>
              </p>
            </div>
            <Link href="/contact">
              <Button variant="outline" className="gap-2 hidden sm:flex">
                <Users className="w-4 h-4" /> Register as Business Buyer
              </Button>
            </Link>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-24 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No products found.</p>
              <p className="text-xs mt-1">Try a different category or clear the search.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(p => (
                <ProductCard key={p.id} product={p} onInquiry={name => setInquiryProduct(name)} onPlayVideo={url => setVideoLightbox(url)} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── How to order ──────────────────────────────────────────────────────── */}
      <section className="py-16 bg-card/50 border-y border-border">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-bold tracking-widest uppercase mb-4">
              Simple Process
            </div>
            <h2 className="text-3xl font-heading font-bold">How to Purchase Imported Products</h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Four steps to get premium imported goods delivered directly to your business.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PROCESS_STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center">
                {i < PROCESS_STEPS.length - 1 && (
                  <div className="hidden lg:block absolute top-10 left-[calc(50%+2.5rem)] w-[calc(100%-5rem)] h-px border-t border-dashed border-border" />
                )}
                <div
                  className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white shadow-lg relative z-10"
                  style={{ background: "linear-gradient(135deg, #0F3D2E, #1a5c44)" }}
                >
                  <step.icon className="w-8 h-8" />
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-background text-xs font-black flex items-center justify-center">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-heading font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Warehouses ────────────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-heading font-bold mb-2">Our Warehouse Network</h2>
            <p className="text-muted-foreground">Stock available across Pakistan for fast delivery to your business.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {WAREHOUSES.map(wh => (
              <Card key={wh.city} className="border-border/60 hover:border-primary/30 transition-all hover:shadow-md">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0F3D2E20, #0F3D2E40)" }}>
                    <Warehouse className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-base">{wh.city}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{wh.address}</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-accent" />
                    <span className="font-semibold">{wh.capacity}</span>
                    <span className="text-muted-foreground">capacity</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Zap className="w-3.5 h-3.5" /> {wh.temp}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits ──────────────────────────────────────────────────────────── */}
      <section className="py-12 border-t border-border bg-card/30">
        <div className="container px-4 md:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Building2,   title: "Direct from OG Exports",    desc: "No middlemen. You buy directly from us — the importer and owner of all listed stock." },
              { icon: BadgeCheck,  title: "Quality Guaranteed",         desc: "Every lot tested and certified before listing. COA provided with every shipment." },
              { icon: Truck,       title: "Pan-Pakistan Delivery",       desc: "We arrange transport from our warehouses to your business across Pakistan." },
              { icon: Zap,         title: "Fast Fulfillment",            desc: "Most orders dispatched within 3–5 business days of payment confirmation." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-4">
                <div className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center bg-primary/10">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">{title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Business buyer registration CTA ──────────────────────────────────── */}
      <section className="py-20" style={{ background: "linear-gradient(135deg, #0F3D2E, #1a5c44)" }}>
        <div className="container px-4 md:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-400/30 bg-amber-400/10 text-amber-400 text-xs font-bold tracking-widest uppercase mb-6">
            <Star className="w-3.5 h-3.5" /> Verified Business Buyers Only
          </div>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            Ready to Source Imported Products?
          </h2>
          <p className="text-white/70 max-w-xl mx-auto mb-3 text-lg">
            Register as a verified business buyer to access exclusive pricing,
            priority stock allocation, and a dedicated account manager.
          </p>
          <p className="text-white/50 text-sm mb-8">
            Business KYC required · Bulk orders only · Minimum order quantities apply
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact">
              <Button size="lg" className="gap-2 font-semibold" style={{ background: "hsl(43 85% 47%)", color: "#1F2933" }}>
                <Users className="w-5 h-5" /> Register as Business Buyer
              </Button>
            </Link>
            <a href="https://wa.me/923001234567" target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
                <Phone className="w-5 h-5" /> WhatsApp Us
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* ── Inquiry modal ─────────────────────────────────────────────────────── */}
      {inquiryProduct && (
        <InquiryModal product={inquiryProduct} onClose={() => setInquiryProduct(null)} />
      )}
      {videoLightbox && <VideoLightbox url={videoLightbox} onClose={() => setVideoLightbox(null)} />}
    </div>
  )
}
