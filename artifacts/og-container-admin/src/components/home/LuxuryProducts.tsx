import React, { useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowRight, CheckCircle } from "lucide-react";
import { useProducts } from "@workspace/api-client-react";

export function LuxuryProducts() {
  const [activeCategory, setActiveCategory] = useState("All");
  const { data: productPage, isLoading } = useProducts({ featured: true, per_page: 12 });

  const featured = useMemo(
    () => (productPage?.data || []).filter((p: any) => p && (p.featured !== false)).slice(0, 6),
    [productPage],
  );

  const categoryOptions = useMemo(() => {
    const names = Array.from(new Set(featured.map((p: any) => p.category).filter(Boolean))) as string[];
    return ["All", ...names];
  }, [featured]);

  const filtered = activeCategory === "All"
    ? featured
    : featured.filter((p: any) => p.category === activeCategory);

  const display = filtered.length ? filtered : featured;

  return (
    <>
      <section
        className="py-28 lg:py-36 relative overflow-hidden"
        style={{ background: "white" }}
      >
        <div
          className="absolute top-0 left-0 w-[800px] h-[800px] pointer-events-none"
          style={{
            background: "radial-gradient(ellipse, hsl(158 59% 15% / 0.025) 0%, transparent 70%)",
            transform: "translate(-30%, -30%)",
          }}
        />

        <div className="container relative z-10 px-4 md:px-6">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
            <div className="max-w-2xl space-y-5">
              <div className="badge-gold">Premium Products</div>
              <h2
                className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1]"
                style={{ color: "hsl(207 24% 16%)" }}
              >
                World-Class
                <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
                  Agricultural Commodities
                </span>
              </h2>
              <div className="w-16 h-[3px] rounded-full" style={{ background: "hsl(38 41% 59%)" }} />
              <p className="text-lg leading-relaxed" style={{ color: "hsl(207 16% 42%)" }}>
                Export-grade produce and grains sourced directly from Pakistan's premium
                agricultural regions — tested, certified, and ready for global markets.
              </p>
            </div>
            <Link
              href="/products"
              className="hidden lg:inline-flex items-center gap-2.5 font-heading font-semibold text-sm transition-all duration-300 group whitespace-nowrap"
              style={{ color: "hsl(158 59% 15%)" }}
            >
              View Full Catalog
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          {categoryOptions.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-10">
              {categoryOptions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className="px-4 py-2 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: activeCategory === cat ? "hsl(158 59% 15%)" : "hsl(60 10% 96%)",
                    color: activeCategory === cat ? "white" : "hsl(207 16% 42%)",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-7">
            {isLoading && display.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground text-sm">Loading products…</div>
            )}
            {!isLoading && display.length === 0 && (
              <div className="col-span-full text-center py-16 text-muted-foreground text-sm">No featured products yet.</div>
            )}
            {display.map((product: any, i: number) => (
              <article
                key={product.id}
                className="group rounded-3xl overflow-hidden border flex flex-col transition-all duration-400"
                style={{
                  background: "white",
                  borderColor: "hsl(60 10% 88%)",
                  boxShadow: "0 2px 12px hsl(0 0% 0% / 0.05)",
                  animationDelay: `${i * 0.08}s`,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(38 41% 59% / 0.45)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 40px hsl(0 0% 0% / 0.10), 0 0 0 1px hsl(38 41% 59% / 0.12)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(60 10% 88%)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px hsl(0 0% 0% / 0.05)";
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                }}
              >
                <Link
                  href={`/products/${product.slug}`}
                  className="relative overflow-hidden aspect-[4/3] cursor-pointer bg-muted block"
                >
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="object-cover w-full h-full"
                      style={{ transition: "transform 0.7s ease" }}
                      onMouseEnter={e => (e.currentTarget.style.transform = "scale(1.07)")}
                      onMouseLeave={e => (e.currentTarget.style.transform = "scale(1)")}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
                  )}
                  <div
                    className="absolute top-4 left-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                    style={{ background: "hsl(158 59% 15%)", color: "white" }}
                  >
                    {product.category || "Product"}
                  </div>
                  {product.featured && (
                    <div
                      className="absolute top-4 right-4 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider"
                      style={{ background: "hsl(38 41% 59%)", color: "hsl(207 24% 10%)" }}
                    >
                      Featured
                    </div>
                  )}
                  <div
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: "hsl(0 0% 0% / 0.35)" }}
                  >
                    <div
                      className="flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold"
                      style={{ background: "white", color: "hsl(207 24% 16%)" }}
                    >
                      View Details
                    </div>
                  </div>
                </Link>

                <div className="p-7 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-xs font-medium mb-3" style={{ color: "hsl(207 16% 58%)" }}>
                    <CheckCircle className="w-3.5 h-3.5" style={{ color: "hsl(123 38% 45%)" }} />
                    Verified Export Quality
                    <span className="ml-auto text-xs" style={{ color: "hsl(207 16% 65%)" }}>
                      HS: {product.hsCode || "—"}
                    </span>
                  </div>

                  <h3 className="text-xl font-heading font-bold mb-3" style={{ color: "hsl(207 24% 16%)" }}>
                    <Link href={`/products/${product.slug}`}>{product.name}</Link>
                  </h3>

                  <p className="text-sm leading-relaxed flex-1 mb-5" style={{ color: "hsl(207 16% 46%)" }}>
                    {product.shortDescription}
                  </p>

                  <div className="flex items-center justify-between pt-5" style={{ borderTop: "1px solid hsl(60 10% 90%)" }}>
                    <div className="text-sm" style={{ color: "hsl(207 16% 55%)" }}>
                      Origin: <span className="font-semibold" style={{ color: "hsl(207 24% 20%)" }}>{product.origin || "—"}</span>
                    </div>
                    <div className="text-sm" style={{ color: "hsl(207 16% 55%)" }}>
                      MOQ: <span className="font-semibold" style={{ color: "hsl(207 24% 20%)" }}>{String(product.moq || product.minOrder || "—").split("(")[0]}</span>
                    </div>
                  </div>

                  <Link href={`/products/${product.slug}`}>
                    <button
                      className="mt-5 w-full h-11 rounded-xl font-heading font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
                      style={{
                        background: "hsl(158 59% 15% / 0.06)",
                        color: "hsl(158 59% 15%)",
                        border: "1px solid hsl(158 59% 15% / 0.20)",
                      }}
                    >
                      View Specifications <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 flex justify-center lg:hidden">
            <Link href="/products">
              <button
                className="inline-flex items-center gap-2.5 h-13 px-8 py-4 rounded-full font-heading font-semibold text-sm"
                style={{ background: "hsl(158 59% 15%)", color: "white" }}
              >
                View Full Catalog <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
