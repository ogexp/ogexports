import React from "react";
import { Link } from "wouter";
import { InvestmentModuleOptional } from "@/components/auth/InvestmentModuleGate";
import { ArrowRight, Anchor, Leaf, Factory, TrendingUp, Shield, Clock } from "lucide-react";

const INVESTMENTS = [
  {
    icon: Anchor,
    tag: "Trade Project",
    title: "Containerised Investment",
    desc: "Review current container projects, source documents, and signed terms in the investor portal. Availability, outcomes, and payout timing vary by project.",
    features: [
      "Review the project documents available for each listing",
      "View shipment milestones recorded in the portal; live carrier position is not provided",
      "Check the current minimum and payment instructions in the verified listing",
      "Returns and timing depend on signed terms and trade outcomes",
    ],
    highlight: null,
    highlightColor: "hsl(43 85% 47%)",
    cta: "View Open Containers",
    link: "/invest",
    featured: true,
  },
  {
    icon: Leaf,
    tag: "Seasonal Project",
    title: "Fresh F&V Market",
    desc: "Review current information about Fresh Fruits & Vegetables operations and any related investment terms in the investor portal.",
    features: [
      "Review available project and operations documents",
      "Confirm current availability in the investor portal",
      "Terms and payout timing are specific to each signed project",
    ],
    highlight: null,
    cta: "View Prospectus",
    link: "/invest",
    featured: false,
  },
  {
    icon: Factory,
    tag: "Infrastructure Project",
    title: "Potato Processing Plant",
    desc: "Review current information about the potato processing project and its published documents in the investor portal.",
    features: [
      "Review available project documents",
      "Confirm current availability and terms in the investor portal",
      "Returns and timing depend on signed project terms",
    ],
    highlight: null,
    cta: "View Project",
    link: "/invest",
    featured: false,
  },
];

export function LuxuryInvestment() {
  return (
    <section
      className="py-28 lg:py-36 relative overflow-hidden"
      style={{ background: "hsl(60 17% 96%)" }}
    >
      {/* Ambient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 100%, hsl(43 85% 47% / 0.05) 0%, transparent 70%)",
        }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-5">
          <div className="badge-gold mx-auto w-fit">Investment Opportunities</div>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1]"
            style={{ color: "hsl(207 24% 16%)" }}
          >
            Current Agricultural
            <span className="block" style={{ color: "hsl(158 59% 15%)" }}>
              Project Information
            </span>
          </h2>
          <div className="w-16 h-[3px] rounded-full mx-auto" style={{ background: "hsl(43 85% 47%)" }} />
          <p className="text-lg leading-relaxed" style={{ color: "hsl(207 16% 44%)" }}>
            Review current project descriptions and supporting documents. Only the
            investor portal can confirm active offerings, minimums, and signed terms.
          </p>
        </div>

        {/* Investment Cards */}
        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {INVESTMENTS.map((inv, i) => (
            <div
              key={i}
              className="group relative flex flex-col rounded-3xl border transition-all duration-400 overflow-hidden"
              style={{
                background: inv.featured ? "hsl(158 59% 15%)" : "white",
                borderColor: inv.featured ? "hsl(158 59% 25%)" : "hsl(60 10% 88%)",
                boxShadow: inv.featured ? "0 12px 48px hsl(158 59% 15% / 0.25)" : "0 2px 10px hsl(0 0% 0% / 0.05)",
              }}
              onMouseEnter={e => {
                if (!inv.featured) {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(43 85% 47% / 0.35)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 36px hsl(0 0% 0% / 0.08)";
                }
              }}
              onMouseLeave={e => {
                if (!inv.featured) {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(60 10% 88%)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 10px hsl(0 0% 0% / 0.05)";
                }
              }}
            >
              {/* Popular badge */}
              {inv.highlight && (
                <div
                  className="absolute top-0 right-0 px-4 py-2 text-xs font-black uppercase tracking-widest rounded-bl-2xl"
                  style={{
                    background: "hsl(43 85% 47%)",
                    color: "hsl(207 24% 10%)",
                  }}
                >
                  {inv.highlight}
                </div>
              )}

              <div className="p-8 flex-1 flex flex-col">
                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
                  style={{
                    background: inv.featured ? "hsl(43 85% 47% / 0.15)" : "hsl(158 59% 15% / 0.07)",
                    border: `1px solid ${inv.featured ? "hsl(43 85% 47% / 0.35)" : "hsl(158 59% 15% / 0.20)"}`,
                  }}
                >
                  <inv.icon
                    className="w-6 h-6"
                    style={{ color: inv.featured ? "hsl(38 55% 72%)" : "hsl(158 59% 15%)" }}
                  />
                </div>

                {/* Tag */}
                <div
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: inv.featured ? "hsl(38 55% 65%)" : "hsl(38 41% 55%)" }}
                >
                  {inv.tag}
                </div>

                {/* Title */}
                <h3
                  className="text-2xl font-heading font-bold mb-4"
                  style={{ color: inv.featured ? "white" : "hsl(207 24% 16%)" }}
                >
                  {inv.title}
                </h3>

                {/* Description */}
                <p
                  className="text-sm leading-relaxed mb-6 flex-1"
                  style={{ color: inv.featured ? "hsl(0 0% 100% / 0.60)" : "hsl(207 16% 44%)" }}
                >
                  {inv.desc}
                </p>

                {/* Features */}
                <ul className="space-y-2.5 mb-8">
                  {inv.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2.5 text-sm"
                      style={{ color: inv.featured ? "hsl(0 0% 100% / 0.65)" : "hsl(207 16% 44%)" }}
                    >
                      <TrendingUp
                        className="w-4 h-4 shrink-0 mt-0.5"
                        style={{ color: inv.featured ? "hsl(38 55% 65%)" : "hsl(123 38% 42%)" }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link href={inv.link}>
                  <button
                    className="w-full h-12 rounded-xl font-heading font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-2 group/btn"
                    style={inv.featured ? {
                      background: "hsl(43 85% 47%)",
                      color: "hsl(207 24% 10%)",
                      boxShadow: "0 4px 16px hsl(43 85% 47% / 0.35)",
                    } : {
                      background: "hsl(158 59% 15% / 0.06)",
                      color: "hsl(158 59% 15%)",
                      border: "1px solid hsl(158 59% 15% / 0.20)",
                    }}
                    onMouseEnter={e => {
                      if (!inv.featured) {
                        (e.currentTarget as HTMLElement).style.background = "hsl(158 59% 15%)";
                        (e.currentTarget as HTMLElement).style.color = "white";
                        (e.currentTarget as HTMLElement).style.borderColor = "hsl(158 59% 15%)";
                      }
                    }}
                    onMouseLeave={e => {
                      if (!inv.featured) {
                        (e.currentTarget as HTMLElement).style.background = "hsl(158 59% 15% / 0.06)";
                        (e.currentTarget as HTMLElement).style.color = "hsl(158 59% 15%)";
                        (e.currentTarget as HTMLElement).style.borderColor = "hsl(158 59% 15% / 0.20)";
                      }
                    }}
                  >
                    {inv.cta} <ArrowRight className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA bar */}
        <div
          className="mt-16 p-8 md:p-10 rounded-3xl border flex flex-col md:flex-row items-center justify-between gap-6"
          style={{
            background: "white",
            borderColor: "hsl(43 85% 47% / 0.25)",
            boxShadow: "0 4px 24px hsl(43 85% 47% / 0.08)",
          }}
        >
          <div className="flex items-start gap-4">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "hsl(43 85% 47% / 0.12)", border: "1px solid hsl(43 85% 47% / 0.25)" }}
            >
              <Shield className="w-5 h-5" style={{ color: "hsl(43 85% 47%)" }} />
            </div>
            <div>
              <div className="font-heading font-bold text-lg mb-1" style={{ color: "hsl(207 24% 16%)" }}>
                Review Project Documents
              </div>
              <div className="text-sm" style={{ color: "hsl(207 16% 46%)" }}>
                Before sending funds, verify the project terms, entity details, and payment
                instructions shown in your investor account. Returns are not guaranteed.
              </div>
            </div>
          </div>
          <InvestmentModuleOptional>
          <Link href="/invest" className="shrink-0">
            <button
              className="inline-flex items-center gap-2.5 h-12 px-8 rounded-full font-heading font-semibold text-sm transition-all duration-300 whitespace-nowrap"
              style={{
                background: "hsl(43 85% 47%)",
                color: "hsl(207 24% 10%)",
                boxShadow: "0 4px 16px hsl(43 85% 47% / 0.30)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px hsl(43 85% 47% / 0.50)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px hsl(43 85% 47% / 0.30)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              Explore All Investments <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
          </InvestmentModuleOptional>
        </div>
      </div>
    </section>
  );
}
