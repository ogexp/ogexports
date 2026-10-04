import React from "react";
import { Link } from "wouter";
import { ArrowRight, Globe, Landmark, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const DIVISIONS = [
  {
    id: "export",
    title: "Agricultural Import & Export",
    icon: Globe,
    tagline: "Premium Commodities. Global Trade.",
    desc: "We export 30+ varieties of Pakistan's finest agricultural commodities — Basmati Rice, Yellow Corn, Sesame Seeds, IQF Potatoes, and Fresh Mangoes — to verified buyers across 40+ countries. We also import raw materials, machinery, and ingredients for processing and re-export. Every shipment is fully documented, lab-certified, and insured.",
    features: [
      "Export to 40+ countries — UAE, UK, Europe, SE Asia",
      "Import of raw materials & processing machinery",
      "FOB, CIF, CFR, EXW & Air freight options",
      "SECP registered · Export licensed · Quality assured",
    ],
    cta: "Explore Products",
    ctaLink: "/products",
    accent: "green" as const,
  },
  {
    id: "investment",
    title: "OG Exports Investment Platform",
    icon: Landmark,
    tagline: "Real Assets. Transparent Returns.",
    desc: "Participate in Pakistan's agricultural trade economy through three investment vehicles: Containerised shipments for short-term fixed returns, Fresh Fruits & Vegetables Market operations, and our Potato Processing Plant project for long-term institutional yields.",
    features: [
      "Containerised Investment (30–60 day cycles)",
      "Fresh F&V Market Investment",
      "Potato Processing Plant (long-term)",
      "Full investor dashboard & portfolio tracking",
    ],
    cta: "View Investments",
    ctaLink: "/invest",
    accent: "gold" as const,
  },
];

export function UserRoles() {
  return (
    <section className="py-24 bg-background relative overflow-hidden border-y border-border">
      {/* Section glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 50% at 50% 100%, hsl(155 50% 30% / 0.05) 0%, transparent 70%)" }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="badge-gold mx-auto w-fit">Our Business Divisions</div>
          <h2 className="text-3xl md:text-5xl font-heading font-bold">
            Two Divisions. One Premium Platform.
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Whether you're sourcing agricultural commodities for your business or seeking institutional-grade investment returns, OG Exports has a dedicated division for you.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {DIVISIONS.map((div) => {
            const isGold = div.accent === "gold"
            return (
              <div
                key={div.id}
                className="group rounded-3xl p-10 relative overflow-hidden transition-all duration-500 hover:-translate-y-2 border flex flex-col"
                style={{
                  background: "hsl(var(--card))",
                  borderColor: "hsl(var(--border))",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = isGold ? "hsl(43 88% 52% / 0.45)" : "hsl(155 55% 40% / 0.45)"
                  el.style.boxShadow = isGold
                    ? "0 8px 40px hsl(43 88% 52% / 0.12)"
                    : "0 8px 40px hsl(155 55% 40% / 0.12)"
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = "hsl(var(--border))"
                  el.style.boxShadow = "none"
                }}
              >
                {/* Hover glow */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-3xl"
                  style={{
                    background: isGold
                      ? "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(43 88% 52% / 0.07) 0%, transparent 70%)"
                      : "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(155 55% 40% / 0.08) 0%, transparent 70%)"
                  }}
                />

                <div className="relative z-10 flex flex-col h-full space-y-6">
                  {/* Icon */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-500"
                    style={{
                      background: isGold ? "hsl(43 88% 52% / 0.10)" : "hsl(155 55% 40% / 0.10)",
                      border: `1px solid ${isGold ? "hsl(43 88% 52% / 0.25)" : "hsl(155 55% 40% / 0.25)"}`,
                    }}
                  >
                    <div.icon
                      className="w-7 h-7 transition-colors"
                      style={{ color: isGold ? "hsl(var(--accent))" : "hsl(var(--primary))" }}
                    />
                  </div>

                  {/* Header */}
                  <div>
                    <p
                      className="text-xs font-bold uppercase tracking-widest mb-2"
                      style={{ color: isGold ? "hsl(var(--accent))" : "hsl(var(--primary))" }}
                    >
                      {div.tagline}
                    </p>
                    <h3 className="text-2xl font-heading font-bold">{div.title}</h3>
                  </div>

                  {/* Description */}
                  <p className="text-muted-foreground leading-relaxed flex-1">{div.desc}</p>

                  {/* Features */}
                  <ul className="space-y-2.5">
                    {div.features.map((f, i) => (
                      <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                        <CheckCircle2
                          className="w-4 h-4 shrink-0"
                          style={{ color: isGold ? "hsl(var(--accent))" : "hsl(var(--primary))" }}
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <Link href={div.ctaLink}>
                    <Button
                      className="w-full justify-between font-heading font-semibold border-0"
                      style={isGold ? {
                        background: "hsl(var(--accent))",
                        color: "hsl(var(--accent-foreground))",
                        boxShadow: "0 2px 12px hsl(43 88% 52% / 0.28)"
                      } : {
                        background: "hsl(var(--primary))",
                        color: "hsl(var(--primary-foreground))",
                        boxShadow: "0 2px 12px hsl(155 55% 40% / 0.25)"
                      }}
                    >
                      {div.cta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  );
}
