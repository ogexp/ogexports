import * as React from "react"
import { usePageTitle } from "@/hooks/use-page-title"
import { Link } from "wouter"
import { Search, Filter, ShieldCheck, Mail, PackageOpen, CreditCard, ChevronRight, Play, X as XIcon, ChevronLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useDebounce } from "@/hooks/use-debounce"
import { useListProductCategories, useProducts } from "@workspace/api-client-react"
import { RequestQuoteDialog, type QuoteProduct } from "@/components/RequestQuoteDialog"

// ─── Video Lightbox ────────────────────────────────────────────────────────────
function VideoLightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/92 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative w-full max-w-3xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-white/60 text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5">
            <Play className="w-3 h-3" /> Product Preview · 20 sec
          </span>
          <button onClick={onClose} className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="rounded-2xl overflow-hidden aspect-video bg-black shadow-2xl">
          <video src={url} controls autoPlay className="w-full h-full" />
        </div>
      </div>
    </div>
  )
}

export default function Products() {
  usePageTitle("Products", "Browse premium Pakistan agricultural exports — Basmati rice, sesame seeds, yellow maize, fresh mangoes, frozen IQF produce, and spices. Available in bulk for B2B buyers worldwide.")
  const [search, setSearch] = React.useState("")
  const debouncedSearch = useDebounce(search, 300)
  const [activeCategory, setActiveCategory] = React.useState<string | undefined>()
  const [page, setPage] = React.useState(1)
  const [videoLightbox, setVideoLightbox] = React.useState<string | null>(null)
  const [quoteProduct, setQuoteProduct] = React.useState<QuoteProduct>(null)

  const { data, isLoading, isError } = useProducts({
    page,
    per_page: 12,
    search: debouncedSearch || undefined,
    category: activeCategory || undefined,
  })
  const { data: categoryData = [] } = useListProductCategories()

  const products = (data?.data || []) as any[]
  const meta = data?.meta || { current_page: 1, last_page: 1, per_page: 12, total: 0 }
  const categories = (categoryData as any[]).map(category => ({
    name: category.name as string,
    slug: category.slug as string,
  }))

  React.useEffect(() => { setPage(1) }, [debouncedSearch, activeCategory])

  return (
    <>
    <div className="min-h-screen bg-background">
      {/* Page Header */}
      <div className="bg-card border-b border-border py-16 md:py-24">
        <div className="container px-4 md:px-6 max-w-4xl text-center space-y-6">
          <div className="inline-flex items-center px-3 py-1 rounded-full border border-accent/20 bg-accent/10 text-accent text-xs font-bold tracking-widest uppercase">
            Export-grade | Pakistan Origin | Direct Exporter
          </div>
          <h1 className="text-4xl md:text-6xl font-heading font-bold">Product Catalog</h1>
          <p className="text-xl text-muted-foreground">
            Explore our range of premium agricultural exports. Fully compliant, meticulously processed, and ready for global delivery.
          </p>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-12 md:py-16">
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* Filters Sidebar */}
          <div className="w-full md:w-64 shrink-0 space-y-8">
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search commodities..."
                  className="pl-9 bg-card border-border"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-heading font-semibold flex items-center gap-2 text-lg">
                <Filter className="w-4 h-4" /> Categories
              </h3>
              <div className="space-y-2 flex flex-col">
                <Button
                  variant="ghost"
                  className={`justify-start w-full ${!activeCategory ? 'bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                  onClick={() => setActiveCategory(undefined)}
                >
                  All Products
                  <span className="ml-auto opacity-60 text-xs">{meta.total}</span>
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.slug}
                    variant="ghost"
                    className={`justify-start w-full ${activeCategory === cat.slug ? 'bg-accent/10 text-accent hover:bg-accent/20 hover:text-accent' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setActiveCategory(cat.slug)}
                  >
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="text-center py-24 text-muted-foreground">Loading products…</div>
            ) : isError ? (
              <div className="text-center py-24 bg-card rounded-xl border border-border">
                <p className="text-muted-foreground text-lg">Unable to load products. Please try again.</p>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-24 bg-card rounded-xl border border-border">
                <p className="text-muted-foreground text-lg">No products found matching your criteria.</p>
                <Button variant="link" onClick={() => { setSearch(""); setActiveCategory(undefined); }} className="mt-4 text-accent">
                  Clear filters
                </Button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-6">
                {products.map((product: any) => {
                  const specs = product.specs || []
                  const paymentTerms = product.paymentTerms || []
                  const packagingOptions = product.packagingOptions || []
                  const slug = product.slug || product.id
                  return (
                    <div key={product.id} className="group bg-card rounded-2xl border border-border overflow-hidden flex flex-col transition-all hover:border-accent/40 shadow-sm hover:shadow-xl hover:shadow-accent/5">

                      <div className="aspect-[16/9] bg-muted relative overflow-hidden">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-6xl">🌾</div>
                        )}
                        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-md text-foreground text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-border uppercase tracking-wider">
                          {product.category}
                        </div>
                        {/* All catalog products are verified OG Exports */}
                        <div className="absolute top-4 right-4 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> VERIFIED
                        </div>
                        {product.videoUrl && (
                          <button
                            onClick={(e) => { e.preventDefault(); setVideoLightbox(product.videoUrl!) }}
                            className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/65 backdrop-blur-sm text-white text-xs font-semibold hover:bg-black/85 transition-colors"
                          >
                            <Play className="w-3.5 h-3.5 fill-white" /> Watch Video
                          </button>
                        )}
                      </div>

                      <div className="p-6 flex-1 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-heading font-semibold text-2xl leading-tight group-hover:text-accent transition-colors">{product.name}</h3>
                            <div className="text-sm text-muted-foreground mt-1">Origin: <span className="font-medium text-foreground">{product.origin}</span></div>
                          </div>
                        </div>

                        <div className="space-y-4 flex-1">
                          {/* Specs Grid */}
                          {specs.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 text-sm bg-muted/30 rounded-lg p-3 border border-border/50">
                              {specs.slice(0, 4).map((spec, i) => (
                                <div key={i} className="flex flex-col">
                                  <span className="text-xs text-muted-foreground">{spec.label}</span>
                                  <span className="font-medium">{spec.value}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Payment & Packaging */}
                          <div className="space-y-3">
                            {paymentTerms.length > 0 && (
                              <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex flex-wrap gap-2">
                                  {paymentTerms.map(term => (
                                    <span key={term} className="text-xs px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border">
                                      {term}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {packagingOptions.length > 0 && (
                              <div className="flex items-start gap-2">
                                <PackageOpen className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                                <div className="text-xs text-muted-foreground leading-relaxed">
                                  {packagingOptions.join(" • ")}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm pt-4">
                          <span className="text-muted-foreground">FOB Price</span>
                          <span className="font-bold text-accent">
                            {product.fobDisplay || "On request"}
                          </span>
                        </div>

                        <div className="pt-4 mt-2 border-t border-border grid grid-cols-2 gap-3">
                          <Link href={`/products/${slug}`}>
                            <Button variant="outline" className="w-full">
                              Details <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                          </Link>
                          <Button
                            className="w-full bg-primary hover:bg-primary/90 text-white gap-2"
                            onClick={() => setQuoteProduct({ id: product.id, name: product.name, slug })}
                          >
                            <Mail className="w-4 h-4" /> Request Quote
                          </Button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {meta.last_page > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <span className="text-sm text-muted-foreground">Page {meta.current_page} of {meta.last_page}</span>
                <Button variant="outline" size="sm" disabled={page >= meta.last_page} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    {videoLightbox && <VideoLightbox url={videoLightbox} onClose={() => setVideoLightbox(null)} />}
    <RequestQuoteDialog
      open={!!quoteProduct}
      onOpenChange={(open) => { if (!open) setQuoteProduct(null) }}
      product={quoteProduct}
    />
    </>
  )
}
