import React from "react";
import { Link } from "wouter";
import { InvestmentModuleOptional } from "@/components/auth/InvestmentModuleGate";
import { ArrowRight, Package, TrendingUp, FileText, BarChart3, Globe, Shield, Wallet, PieChart } from "lucide-react";

const BUYER_FEATURES = [
  { icon: Package, title: "Product Catalog", desc: "Browse 30+ commodities with full specs, pricing, and lab reports" },
  { icon: FileText, title: "RFQ System", desc: "Request formal quotations with custom quantity and packaging" },
  { icon: Globe, title: "Order Tracking", desc: "Real-time shipment tracking from loading to destination" },
  { icon: BarChart3, title: "Market Intelligence", desc: "Live commodity prices and monthly market reports" },
];

const INVEST_FEATURES = [
  { icon: Wallet, title: "Container Investments", desc: "Invest in export-grade commodity containers with fixed-term returns" },
  { icon: Shield, title: "Verified & Compliant", desc: "Full KYC/AML compliance with transparent contract documentation" },
  { icon: TrendingUp, title: "Guaranteed Returns", desc: "Earn competitive returns backed by real agricultural trade flows" },
  { icon: PieChart, title: "Portfolio Dashboard", desc: "Track all investments, payouts, and performance in real-time" },
];

export function LuxuryPortal() {
  return (
    <section
      className="py-28 lg:py-36 relative overflow-hidden"
      style={{ background: "white" }}
    >
      {/* Gold accent line */}
      <div
        className="absolute top-0 inset-x-0 h-[1px]"
        style={{ background: "linear-gradient(to right, transparent, hsl(38 41% 59% / 0.4) 30%, hsl(38 41% 59% / 0.4) 70%, transparent)" }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="badge-green mx-auto w-fit">Buyer &amp; Investment Portal</div>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1]"
            style={{ color: "hsl(207 24% 16%)" }}
          >
            Your Complete
            <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
              Trade Management Platform
            </span>
          </h2>
          <div className="w-16 h-[3px] rounded-full mx-auto" style={{ background: "hsl(38 41% 59%)" }} />
          <p className="text-lg leading-relaxed" style={{ color: "hsl(207 16% 44%)" }}>
            A dedicated digital portal for buyers and investors — streamlining sourcing,
            compliance, and trade investment management from a single dashboard.
          </p>
        </div>

        {/* Two-column portal cards */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Buyer Portal */}
          <div
            className="rounded-3xl overflow-hidden border"
            style={{
              borderColor: "hsl(158 59% 15% / 0.20)",
              boxShadow: "0 4px 24px hsl(158 59% 15% / 0.08)",
            }}
          >
            {/* Header */}
            <div className="p-8 pb-6" style={{ background: "hsl(158 59% 15%)" }}>
              <div
                className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
                style={{
                  background: "hsl(38 41% 59% / 0.15)",
                  border: "1px solid hsl(38 41% 59% / 0.30)",
                  color: "hsl(38 55% 72%)",
                }}
              >
                For Buyers &amp; Importers
              </div>
              <h3 className="text-2xl font-heading font-bold text-white mb-2">Buyer Portal</h3>
              <p className="text-white/55 text-sm leading-relaxed">
                The complete sourcing platform for global importers, distributors, and food manufacturers
                looking for premium Pakistani agricultural commodities.
              </p>
            </div>

            {/* Features */}
            <div className="p-8 pt-6" style={{ background: "hsl(60 17% 97%)" }}>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {BUYER_FEATURES.map((f, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border transition-all duration-300 group cursor-default"
                    style={{ background: "white", borderColor: "hsl(60 10% 88%)" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "hsl(158 59% 15% / 0.25)";
                      (e.currentTarget as HTMLElement).style.background = "hsl(158 59% 15% / 0.04)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "hsl(60 10% 88%)";
                      (e.currentTarget as HTMLElement).style.background = "white";
                    }}
                  >
                    <f.icon className="w-5 h-5 mb-2.5" style={{ color: "hsl(158 59% 15%)" }} />
                    <div className="font-heading font-semibold text-sm mb-1" style={{ color: "hsl(207 24% 16%)" }}>
                      {f.title}
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: "hsl(207 16% 50%)" }}>
                      {f.desc}
                    </div>
                  </div>
                ))}
              </div>
              <Link href="/products">
                <button
                  className="w-full h-12 rounded-xl font-heading font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2"
                  style={{
                    background: "hsl(158 59% 15%)",
                    color: "white",
                    boxShadow: "0 4px 16px hsl(158 59% 15% / 0.25)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px hsl(158 59% 15% / 0.40)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px hsl(158 59% 15% / 0.25)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}
                >
                  Access Buyer Portal <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          {/* Investment Portal */}
          <div
            className="rounded-3xl overflow-hidden border"
            style={{
              borderColor: "hsl(38 41% 59% / 0.25)",
              boxShadow: "0 4px 24px hsl(38 41% 59% / 0.07)",
            }}
          >
            {/* Header */}
            <div className="p-8 pb-6" style={{ background: "hsl(207 24% 16%)" }}>
              <div
                className="inline-flex px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4"
                style={{
                  background: "hsl(38 41% 59% / 0.15)",
                  border: "1px solid hsl(38 41% 59% / 0.30)",
                  color: "hsl(38 55% 72%)",
                }}
              >
                For Investors &amp; Partners
              </div>
              <h3 className="text-2xl font-heading font-bold text-white mb-2">Investment Portal</h3>
              <p className="text-white/55 text-sm leading-relaxed">
                Invest in Pakistan's agricultural export economy. Earn fixed-term returns backed
                by real commodity trade flows and fully verified documentation.
              </p>
            </div>

            {/* Features */}
            <div className="p-8 pt-6" style={{ background: "hsl(60 17% 97%)" }}>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {INVEST_FEATURES.map((f, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-2xl border transition-all duration-300 cursor-default"
                    style={{ background: "white", borderColor: "hsl(60 10% 88%)" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "hsl(38 41% 59% / 0.25)";
                      (e.currentTarget as HTMLElement).style.background = "hsl(38 41% 59% / 0.04)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.borderColor = "hsl(60 10% 88%)";
                      (e.currentTarget as HTMLElement).style.background = "white";
                    }}
                  >
                    <f.icon className="w-5 h-5 mb-2.5" style={{ color: "hsl(38 41% 59%)" }} />
                    <div className="font-heading font-semibold text-sm mb-1" style={{ color: "hsl(207 24% 16%)" }}>
                      {f.title}
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: "hsl(207 16% 50%)" }}>
                      {f.desc}
                    </div>
                  </div>
                ))}
              </div>
              <InvestmentModuleOptional>
              <Link href="/invest">
                <button
                  className="w-full h-12 rounded-xl font-heading font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 border"
                  style={{
                    background: "transparent",
                    color: "hsl(38 41% 50%)",
                    borderColor: "hsl(38 41% 59% / 0.40)",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "hsl(38 41% 59%)";
                    (e.currentTarget as HTMLElement).style.color = "hsl(207 24% 10%)";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(38 41% 59%)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "transparent";
                    (e.currentTarget as HTMLElement).style.color = "hsl(38 41% 50%)";
                    (e.currentTarget as HTMLElement).style.borderColor = "hsl(38 41% 59% / 0.40)";
                  }}
                >
                  Start Investing <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              </InvestmentModuleOptional>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
