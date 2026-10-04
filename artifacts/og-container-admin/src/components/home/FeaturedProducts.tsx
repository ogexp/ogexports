import React from "react";
import { Link } from "wouter";
import { ArrowRight, LayoutGrid, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/lib/admin-data";

export function FeaturedProducts() {
  const products = getProducts().filter(p => p.featured && p.status === "approved");

  return (
    <section className="py-24 lg:py-32 relative overflow-hidden" style={{ background: "hsl(var(--muted) / 0.25)" }}>
      {/* Ambient */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 60% 40% at 50% 0%, hsl(43 88% 52% / 0.05) 0%, transparent 70%)" }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div className="max-w-2xl space-y-4">
            <div className="badge-gold w-fit">Enterprise Sourcing</div>
            <h2 className="text-3xl md:text-5xl font-heading font-bold">Premium Commodities.</h2>
            <p className="text-xl text-muted-foreground">Export-grade produce and grains, tested for global compliance.</p>
          </div>
          <Link
            href="/products"
            className="hidden md:inline-flex items-center gap-2 text-sm font-medium text-foreground/70 hover:text-accent border rounded-full px-6 py-3 transition-all duration-200 hover:border-accent/40 hover:bg-accent/5 group"
            style={{ borderColor: "hsl(var(--border))" }}
          >
            <LayoutGrid className="w-4 h-4" />
            View Full Catalog
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
          {products.slice(0, 3).map((product) => (
            <div
              key={product.id}
              className="group rounded-2xl overflow-hidden border flex flex-col transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                boxShadow: "0 2px 8px hsl(0 0% 0% / 0.06)",
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = "hsl(43 88% 52% / 0.38)"
                el.style.boxShadow = "0 8px 32px hsl(0 0% 0% / 0.10), 0 0 0 1px hsl(43 88% 52% / 0.12)"
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLDivElement
                el.style.borderColor = "hsl(var(--border))"
                el.style.boxShadow = "0 2px 8px hsl(0 0% 0% / 0.06)"
              }}
            >
              {/* Image — navigate directly to product detail */}
              <Link href={`/products/${product.slug}`} className="relative overflow-hidden aspect-[4/3] cursor-pointer block">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                {product.featured && (
                  <div
                    className="absolute top-4 left-4 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest shadow-lg"
                    style={{ background: "hsl(var(--accent))", color: "hsl(var(--accent-foreground))" }}
                  >
                    Featured
                  </div>
                )}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6"
                  style={{ background: "linear-gradient(to top, hsl(0 0% 0% / 0.75) 0%, transparent 60%)" }}
                >
                  <span className="text-white/90 text-sm font-medium flex items-center gap-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                    View Details
                  </span>
                </div>
              </Link>

              {/* Content */}
              <div className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-3">
                  <span
                    className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md"
                    style={{ background: "hsl(var(--accent) / 0.10)", color: "hsl(var(--accent))" }}
                  >
                    {product.category}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-primary" /> Verified
                  </span>
                </div>
                <h3 className="text-xl font-heading font-semibold mb-2 group-hover:text-accent transition-colors duration-200">
                  <Link href={`/products/${product.slug}`}>{product.name}</Link>
                </h3>
                <p className="text-muted-foreground line-clamp-2 mb-5 flex-1 text-sm leading-relaxed">{product.shortDescription}</p>

                <div className="flex justify-between items-center pt-4" style={{ borderTop: "1px solid hsl(var(--border))" }}>
                  <span className="text-sm text-muted-foreground">
                    Origin: <span className="text-foreground font-medium">{product.origin}</span>
                  </span>
                  <Link href={`/products/${product.slug}`}>
                    <Button variant="ghost" size="sm" className="hover:text-accent hover:bg-transparent px-0 text-sm font-medium gap-1">
                      Details <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link href="/products" className="md:hidden mt-12 w-full flex justify-center items-center gap-2 font-medium border rounded-full px-6 py-3 transition-all duration-200 hover:border-accent/40 hover:text-accent"
          style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground) / 0.7)" }}
        >
          <LayoutGrid className="w-4 h-4" /> View Full Catalog
        </Link>
      </div>
    </section>
  );
}
