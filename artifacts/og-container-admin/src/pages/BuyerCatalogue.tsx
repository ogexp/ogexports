import { useMemo, useState } from "react"
import { Link } from "wouter"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useCart } from "@/hooks/useCart"
import { notify } from "@/lib/notify"
import { useListProductCategories, useProducts } from "@workspace/api-client-react"
import {
  Search, Star, Download, Plus, GitCompare,
  Package, Grid3X3, List, Scale, ShoppingCart, Check
} from "lucide-react"

interface Product {
  id: string; name: string; category: string; origin: string; imageUrl: string
  slug?: string
  moq: number; moqLabel: string; priceRange: string; unitPrice: number
  packaging: string[]; availability: "In Stock" | "Contact Us"
  certifications: string[]; grade: string; description: string; saved: boolean
}

const AVAILABILITY_FILTER = ["All", "In Stock", "Contact Us"]

const AVAIL_META: Record<string, { cls: string }> = {
  "In Stock":  { cls: "bg-emerald-500/15 text-emerald-600" },
  "Contact Us": { cls: "bg-blue-500/15 text-blue-600" },
}

export default function BuyerCatalogue() {
  const [search, setSearch]     = useState("")
  const [category, setCategory] = useState("All")
  const [avail, setAvail]       = useState("All")
  const [compare, setCompare]   = useState<string[]>([])
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid")
  const [saved, setSaved]       = useState<Set<string>>(new Set())
  const [added, setAdded]       = useState<Set<string>>(new Set())
  const { data: productPage } = useProducts({ per_page: 50 })
  const { data: categoryData = [] } = useListProductCategories()
  const categories = ["All", ...(categoryData as any[]).map(item => item.name).filter(Boolean)]
  const PRODUCTS: Product[] = useMemo(() => {
    return (productPage?.data || []).map((p: any) => {
      const unitPrice = Number(p.fob || 0)
      const grade = p.specs?.find((spec: any) => String(spec.label).toLowerCase() === "grade")?.value || ""
      return {
        id: String(p.id),
        name: p.name,
        category: p.category || "General",
        origin: p.origin || "Pakistan",
        imageUrl: p.imageUrl || "",
        slug: p.slug || undefined,
        moq: Number(String(p.moq || "1").replace(/[^0-9.]/g, "")) || 1,
        moqLabel: p.moq || p.minOrder || "1 MT",
        priceRange: p.fobDisplay || "Ask quote",
        unitPrice: unitPrice || 0,
        packaging: p.packagingOptions?.length ? p.packagingOptions : ["25 kg PP Bag"],
        availability: Number(p.stock) > 0 ? "In Stock" as const : "Contact Us" as const,
        certifications: p.certifications || [],
        grade,
        description: p.shortDescription || p.description || "",
        saved: false,
      }
    })
  }, [productPage])

  const { addToCart, itemCount } = useCart()

  const filtered = PRODUCTS.filter(p => {
    const matchSearch   = p.name.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
    const matchCat      = category === "All" || p.category === category
    const matchAvail    = avail === "All" || p.availability === avail
    return matchSearch && matchCat && matchAvail
  })

  function toggleCompare(id: string) {
    setCompare(prev => prev.includes(id) ? prev.filter(i => i !== id) : prev.length < 3 ? [...prev, id] : prev)
  }

  function toggleSave(id: string) {
    setSaved(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function handleAddToCart(p: Product) {
    addToCart({
      productId:   p.id,
      productName: p.name,
      icon:        "📦",
      category:    p.category,
      origin:      p.origin,
      qty:         p.moq,
      unitPrice:   p.unitPrice,
      packaging:   p.packaging[0],
      moq:         p.moq,
      availability: p.availability,
    })
    setAdded(prev => { const n = new Set(prev); n.add(p.id); return n })
    setTimeout(() => setAdded(prev => { const n = new Set(prev); n.delete(p.id); return n }), 2000)
  }

  function downloadProductDetails(p: Product) {
    const lines = [
      "OG Exports — Product Details (for order)",
      "========================================",
      `Product ID: ${p.id}`,
      p.slug ? `Slug: ${p.slug}` : null,
      `Name: ${p.name}`,
      `Category: ${p.category}`,
      `Origin: ${p.origin}`,
      `FOB Price: ${p.priceRange}`,
      `MOQ: ${p.moqLabel}`,
      p.grade ? `Grade: ${p.grade}` : null,
      `Availability: ${p.availability}`,
      `Packaging: ${p.packaging.join(", ")}`,
      p.certifications.length ? `Certifications: ${p.certifications.join(", ")}` : null,
      "",
      "Description:",
      p.description || "—",
    ].filter((line): line is string => line != null)

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    const safeName = (p.slug || p.name || p.id).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "")
    a.href = url
    a.download = `Product-${safeName || p.id}-details.txt`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    notify.success("Product details saved")
  }

  return (
    <BuyerPortalLayout title="Product Catalogue" subtitle="Browse, compare and add commodities to your cart">
      <div className="space-y-6">

        {/* Cart indicator */}
        {itemCount > 0 && (
          <div className="flex items-center justify-between p-4 rounded-xl border" style={{ background: "#0F3D2E0A", borderColor: "#0F3D2E30" }}>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" style={{ color: "#0F3D2E" }} />
              <span className="text-sm font-semibold">{itemCount} item{itemCount > 1 ? "s" : ""} in your cart</span>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" asChild>
                <Link href="/buyer/cart">View Cart</Link>
              </Button>
              <Button size="sm" style={{ background: "#0F3D2E", color: "#F7F7F2" }} asChild>
                <Link href="/buyer/checkout">Checkout →</Link>
              </Button>
            </div>
          </div>
        )}

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search products, grades, origins..." className="pl-9 h-10" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-accent" value={category} onChange={e => setCategory(e.target.value)}>
            {categories.map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="px-3 py-2 rounded-lg text-sm bg-background border border-border focus:outline-none focus:border-accent" value={avail} onChange={e => setAvail(e.target.value)}>
            {AVAILABILITY_FILTER.map(a => <option key={a}>{a}</option>)}
          </select>
          <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-colors ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Grid3X3 className="w-4 h-4" /></button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-colors ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><List className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Compare bar */}
        {compare.length > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-xl border border-blue-500/20 bg-blue-500/5">
            <GitCompare className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-sm font-medium">{compare.length} product{compare.length > 1 ? "s" : ""} selected for comparison</span>
            <Button size="sm" className="ml-auto" disabled={compare.length < 2}>Compare Now</Button>
            <Button size="sm" variant="outline" onClick={() => setCompare([])}>Clear</Button>
          </div>
        )}

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{filtered.length} product{filtered.length !== 1 ? "s" : ""} found</p>
          <p className="text-xs text-muted-foreground">Showing export-grade commodities only</p>
        </div>

        {/* Product Grid */}
        <div className={viewMode === "grid" ? "grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
          {filtered.map(p => {
            const avMeta    = AVAIL_META[p.availability]
            const isComparing = compare.includes(p.id)
            const isSaved   = saved.has(p.id)
            const isAdded   = added.has(p.id)

            if (viewMode === "list") return (
              <Card key={p.id} className={`glass-card hover:border-accent/30 transition-all ${isComparing ? "border-blue-500/30" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex gap-4">
                    <div className="w-24 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 className="font-heading font-bold text-base">{p.name}</h3>
                          <p className="text-xs text-muted-foreground">{p.category} · {p.origin} · {p.grade}</p>
                        </div>
                        <Badge className={`text-[10px] border-0 ${avMeta.cls}`}>{p.availability}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{p.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs">
                        <span><strong>MOQ:</strong> {p.moqLabel}</span>
                        <span><strong>FOB Price:</strong> <span className="text-accent font-bold">{p.priceRange}</span></span>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleAddToCart(p)}
                        style={isAdded ? { background: "#4CAF50", color: "#fff" } : { background: "#0F3D2E", color: "#F7F7F2" }}
                        className="gap-1"
                      >
                        {isAdded ? <><Check className="w-3.5 h-3.5" /> Added</> : <><ShoppingCart className="w-3.5 h-3.5" /> Add to Cart</>}
                      </Button>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/buyer/rfq/new?product_id=${p.id}`}>RFQ</Link>
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => downloadProductDetails(p)} title="Download product details">
                        <Download className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleSave(p.id)}>
                        <Star className={`w-3.5 h-3.5 ${isSaved ? "fill-accent text-accent" : ""}`} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )

            return (
              <Card key={p.id} className={`glass-card hover:shadow-md hover:border-accent/30 transition-all flex flex-col ${isComparing ? "border-blue-500/30 ring-1 ring-blue-500/20" : ""}`}>
                <div className="aspect-[16/9] overflow-hidden rounded-t-xl bg-muted">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">📦</div>
                  )}
                </div>
                <CardContent className="p-5 flex flex-col flex-1 gap-3">
                  <div className="flex items-start justify-between">
                    <Badge className={`text-[10px] border-0 ${avMeta.cls}`}>{p.availability}</Badge>
                    <div className="flex gap-1">
                      <button onClick={() => toggleSave(p.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
                        <Star className={`w-3.5 h-3.5 ${isSaved ? "fill-accent text-accent" : "text-muted-foreground"}`} />
                      </button>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-sm leading-tight">{p.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{p.category} · {p.origin}</p>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed flex-1 line-clamp-3">{p.description}</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">MOQ</span>
                      <span className="font-semibold">{p.moqLabel}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FOB Price</span>
                      <span className="font-bold text-accent">{p.priceRange}</span>
                    </div>
                    {p.grade && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Grade</span>
                        <span className="font-semibold truncate max-w-[120px] text-right">{p.grade}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {p.certifications.slice(0, 2).map(c => <Badge key={c} className="bg-muted text-muted-foreground border-0 text-[10px]">{c}</Badge>)}
                  </div>

                  {/* Add to Cart button — primary CTA */}
                  <button
                    onClick={() => handleAddToCart(p)}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all duration-300"
                    style={
                      isAdded
                        ? { background: "#4CAF50", color: "#fff" }
                        : { background: "#0F3D2E", color: "#F7F7F2" }
                    }
                  >
                    {isAdded
                      ? <><Check className="w-3.5 h-3.5" /> Added to Cart!</>
                      : <><ShoppingCart className="w-3.5 h-3.5" /> Add to Cart</>
                    }
                  </button>

                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 text-xs" variant="outline" asChild>
                      <Link href={`/buyer/rfq/new?product_id=${p.id}`}><Plus className="w-3 h-3 mr-1" />RFQ</Link>
                    </Button>
                    <button onClick={() => toggleCompare(p.id)} className={`px-2 py-1.5 rounded-lg text-xs border transition-colors ${isComparing ? "border-blue-500/40 bg-blue-500/10 text-blue-600" : "border-border text-muted-foreground hover:border-accent/40"}`}>
                      <Scale className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadProductDetails(p)}
                      title="Download product details"
                      className="px-2 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:border-accent/40 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="py-16 text-center text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-4 opacity-40" />
            <p className="text-sm">No products match your search.</p>
          </div>
        )}
      </div>
    </BuyerPortalLayout>
  )
}
