import React from "react";
import { Link } from "wouter";
import { InvestmentModuleOptional } from "@/components/auth/InvestmentModuleGate";
import { ArrowRight, Shield, TrendingUp, Anchor, Cpu, Leaf, Factory } from "lucide-react";
import { Button } from "@/components/ui/button";

export function MarketplaceSections() {
  return (
    <div className="flex flex-col">

      {/* 1. Investment Section */}
      <section className="py-24 bg-card relative overflow-hidden border-b border-border">
        {/* Gold ambient glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full blur-[120px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse, hsl(43 88% 52% / 0.07) 0%, transparent 70%)" }}
        />

        <div className="container relative z-10 px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <div className="badge-gold mx-auto w-fit">
              Investment Platform
            </div>
            <h2 className="text-3xl md:text-5xl font-heading font-bold">Three Investment Opportunities.</h2>
            <p className="text-xl text-muted-foreground">
              Participate in Pakistan's agricultural export economy through three distinct, transparent investment vehicles.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Containerised — Gold Featured */}
            <div className="group p-8 rounded-3xl border flex flex-col relative overflow-hidden transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "hsl(43 88% 52% / 0.06)",
                borderColor: "hsl(43 88% 52% / 0.28)",
              }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "hsl(43 88% 52% / 0.15)", border: "1px solid hsl(43 88% 52% / 0.3)" }}
              >
                <Anchor className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-heading font-bold mb-3">Containerised Investment</h3>
              <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                Review current container projects, supporting documents, and signed terms in the investor portal. Returns and payout timing depend on each project and its trade outcome.
              </p>
              <InvestmentModuleOptional>
              <Link href="/invest">
                <Button className="w-full gap-2 bg-accent text-accent-foreground hover:bg-accent/90 border-0 shadow-[0_2px_12px_hsl(43_88%_52%_/_0.3)]">
                  View Open Containers <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              </InvestmentModuleOptional>
            </div>

            {/* Fresh F&V — Green */}
            <div className="group p-8 rounded-3xl border flex flex-col transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "hsl(155 55% 40% / 0.05)",
                borderColor: "hsl(var(--border))",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(155 55% 40% / 0.40)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "hsl(155 55% 40% / 0.12)", border: "1px solid hsl(155 55% 40% / 0.28)" }}
              >
                <Leaf className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-bold mb-3">Fresh F&amp;V Market Investment</h3>
              <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                Invest in the operation of a dedicated Fresh Fruits &amp; Vegetables export processing hub. Stable annual returns from a recurring, seasonal business model.
              </p>
              <ul className="space-y-2 mb-6">
                {["Seasonal procurement advantage", "Cold-chain infrastructure", "Year-round export capability"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <InvestmentModuleOptional>
              <Link href="/invest">
                <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/8 hover:border-primary/50">
                  View Prospectus <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              </InvestmentModuleOptional>
            </div>

            {/* Potato Processing Plant — Primary themed */}
            <div className="group p-8 rounded-3xl border flex flex-col transition-all duration-300 hover:-translate-y-1"
              style={{
                background: "hsl(155 40% 35% / 0.05)",
                borderColor: "hsl(var(--border))",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "hsl(155 45% 40% / 0.40)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "hsl(var(--border))")}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: "hsl(155 45% 35% / 0.14)", border: "1px solid hsl(155 45% 35% / 0.28)" }}
              >
                <Factory className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-xl font-heading font-bold mb-3">Potato Processing Plant</h3>
              <p className="text-muted-foreground mb-6 flex-1 text-sm leading-relaxed">
                Long-term investment in a state-of-the-art IQF potato processing facility. Captures high GCC and European frozen food market margins at source.
              </p>
              <ul className="space-y-2 mb-6">
                {["IQF & frozen french fry production", "GCC + European export markets", "High value-add on raw commodity"].map((f, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <TrendingUp className="w-3.5 h-3.5 text-primary shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <InvestmentModuleOptional>
              <Link href="/invest">
                <Button variant="outline" className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/8 hover:border-primary/50">
                  View Project <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              </InvestmentModuleOptional>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Market Intel & KYC */}
      <section className="py-24 bg-background relative overflow-hidden border-b border-border">
        <div className="container px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Market Intel */}
            <div className="group p-8 rounded-3xl border flex flex-col justify-between relative overflow-hidden transition-all duration-300"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
            >
              <Cpu className="absolute -bottom-8 -right-8 w-56 h-56 pointer-events-none transition-transform duration-700 group-hover:scale-110"
                style={{ color: "hsl(var(--primary) / 0.06)" }}
              />
              <div className="relative z-10 space-y-4">
                <div className="badge-gold w-fit">Market Intelligence</div>
                <h3 className="text-2xl font-heading font-bold">Commodity Price Reports</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Live and historical price data on Basmati Rice, Yellow Corn, Sesame Seeds, and other key commodities. Our reports help buyers and investors make confident decisions.
                </p>
                <div className="pt-4">
                  <Link href="/market-intelligence">
                    <Button className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                      View Reports <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            {/* KYC */}
            <div className="group p-8 rounded-3xl border flex flex-col justify-between relative overflow-hidden transition-all duration-300"
              style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--card))" }}
            >
              <Shield className="absolute -bottom-8 -right-8 w-56 h-56 pointer-events-none transition-transform duration-700 group-hover:scale-110"
                style={{ color: "hsl(var(--accent) / 0.05)" }}
              />
              <div className="relative z-10 space-y-4">
                <div className="badge-green w-fit">Investor Compliance</div>
                <h3 className="text-2xl font-heading font-bold">Investor Verification (KYC)</h3>
                <p className="text-muted-foreground leading-relaxed">
                  All investors complete standard KYC/KYB verification before accessing investment opportunities. SECP-compliant documentation ensures a secure, regulated environment.
                </p>
                <div className="pt-4">
                  <Link href="/sign-up">
                    <Button variant="outline" className="gap-2 border-accent/30 text-accent hover:bg-accent/8 hover:border-accent/50">
                      Register as Investor <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
