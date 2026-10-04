import React, { useState } from "react";
import { Leaf, FlaskConical, Box, Ship, Package, UserCheck, BarChart3, DollarSign, Anchor, Wallet } from "lucide-react";

const EXPORT_STEPS = [
  {
    icon: Leaf,
    title: "Direct Farm Sourcing",
    description: "We procure directly from Punjab and Sindh farming communities at harvest — locking in premium quality and competitive pricing at the point of origin.",
    detail: "Our agronomists inspect fields pre-harvest. Contracts are signed directly with farming cooperatives, eliminating broker markups and ensuring full traceability from soil to shipment.",
    number: "01",
  },
  {
    icon: FlaskConical,
    title: "Laboratory Quality Testing",
    description: "Every lot undergoes rigorous analysis — moisture, purity, broken grain %, aflatoxin, heavy metals, and foreign matter — against EU, FDA, and Gulf import standards.",
    detail: "Testing is conducted at PCSIR-accredited facilities. Buyers receive full COA (Certificate of Analysis) with every shipment, alongside third-party verification reports on request.",
    number: "02",
  },
  {
    icon: Box,
    title: "Precision Packaging",
    description: "Export-grade packaging in climate-controlled facilities. Custom branding, weight specifications, and country-specific markings produced per buyer requirements.",
    detail: "Available in 1 KG to 50 KG configurations with OEM/private label options. Packaging complies with importer-country labeling laws for EU, UK, UAE, and US markets.",
    number: "03",
  },
  {
    icon: Package,
    title: "Customs & Documentation",
    description: "Full customs clearance, phytosanitary certification, COA, fumigation records, packing lists, and LC-compliant commercial invoices — all prepared in-house.",
    detail: "Our documentation team has zero-rejection track record with Port Qasim Customs. We prepare all paperwork in parallel with loading to minimize port dwell time.",
    number: "04",
  },
  {
    icon: Ship,
    title: "Global Delivery",
    description: "End-to-end shipment tracking from Port Qasim to destination port. Real-time updates shared with buyers and investors throughout the voyage.",
    detail: "We work with Maersk, CMA CGM, MSC, and regional carriers. All cargo is insured. Buyers receive Bill of Lading, SGS weight certificates, and origin documentation.",
    number: "05",
  },
];

const INVEST_STEPS = [
  {
    icon: UserCheck,
    title: "Register & Complete KYC",
    description: "Create your investor account and complete SECP-compliant identity verification in under 10 minutes — fully digital, fully secure.",
    detail: "Our KYC process meets international AML/CFT standards. Individual and corporate investors complete separate verification tracks. Approvals typically within 24 hours.",
    number: "01",
  },
  {
    icon: BarChart3,
    title: "Review & Select Investment",
    description: "Browse open containers, Fresh F&V Market operations, or the Potato Processing Plant. Every opportunity comes with full transparency documents.",
    detail: "Each investment listing includes: commodity type, route, expected return, risk rating, funding progress, and timeline. No hidden terms — full prospectus available.",
    number: "02",
  },
  {
    icon: DollarSign,
    title: "Deposit Capital",
    description: "Transfer via bank wire or SWIFT to our HBL escrow account. Minimum $100 for containers, $5,000 for long-term infrastructure projects.",
    detail: "Funds are held in a segregated escrow account. You receive a digital investment certificate and portfolio confirmation immediately upon clearance.",
    number: "03",
  },
  {
    icon: Anchor,
    title: "Live Tracking",
    description: "Monitor your container's voyage, loading stages, customs clearance, and port arrival live from your investor dashboard.",
    detail: "Real-time updates via our investor portal: vessel tracking, loading confirmations, buyer payment status, and documentation milestones — all in one place.",
    number: "04",
  },
  {
    icon: Wallet,
    title: "Receive Your Return",
    description: "Principal plus profit-share credited to your investor wallet upon buyer settlement and verified receipt of funds.",
    detail: "Returns are distributed within 3 business days of buyer payment confirmation. Funds can be reinvested or withdrawn to your bank account via SWIFT.",
    number: "05",
  },
];

type Tab = "export" | "invest";

export function LuxuryProcess() {
  const [activeTab, setActiveTab] = useState<Tab>("export");
  const [activeStep, setActiveStep] = useState(0);

  const steps = activeTab === "export" ? EXPORT_STEPS : INVEST_STEPS;

  return (
    <section
      className="py-28 lg:py-36 relative overflow-hidden"
      style={{ background: "hsl(158 59% 15%)" }}
    >
      {/* Decorative elements */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, hsl(43 85% 47% / 0.08) 0%, transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, hsl(123 38% 49% / 0.10) 0%, transparent 70%)",
          transform: "translate(-30%, 30%)",
        }}
      />

      {/* Gold top line */}
      <div
        className="absolute top-0 inset-x-0 h-[1px]"
        style={{ background: "linear-gradient(to right, transparent, hsl(43 85% 47% / 0.5) 30%, hsl(43 85% 47% / 0.5) 70%, transparent)" }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-5">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border"
            style={{
              background: "hsl(43 85% 47% / 0.12)",
              borderColor: "hsl(43 85% 47% / 0.30)",
              color: "hsl(43 88% 68%)",
            }}
          >
            How It Works
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1] text-white">
            Institutional Precision
            <span className="block" style={{ color: "hsl(43 88% 68%)" }}>
              At Every Step
            </span>
          </h2>
          <div className="w-16 h-[3px] rounded-full mx-auto" style={{ background: "hsl(43 85% 47%)" }} />
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-16">
          <div
            className="flex p-1.5 rounded-full"
            style={{ background: "hsl(0 0% 100% / 0.06)", border: "1px solid hsl(0 0% 100% / 0.10)" }}
          >
            {(["export", "invest"] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setActiveStep(0); }}
                className="px-8 py-3 rounded-full font-heading font-semibold text-sm transition-all duration-300 capitalize"
                style={activeTab === tab ? {
                  background: "hsl(43 85% 47%)",
                  color: "hsl(207 24% 10%)",
                  boxShadow: "0 2px 12px hsl(43 85% 47% / 0.35)",
                } : {
                  color: "hsl(0 0% 100% / 0.55)",
                }}
                onMouseEnter={e => {
                  if (activeTab !== tab) (e.currentTarget as HTMLElement).style.color = "white";
                }}
                onMouseLeave={e => {
                  if (activeTab !== tab) (e.currentTarget as HTMLElement).style.color = "hsl(0 0% 100% / 0.55)";
                }}
              >
                {tab === "export" ? "Export Process" : "Investment Process"}
              </button>
            ))}
          </div>
        </div>

        {/* Steps Layout */}
        <div className="grid lg:grid-cols-5 gap-0 mb-16">
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={() => setActiveStep(i)}
              className="flex flex-col items-center text-center p-6 rounded-2xl transition-all duration-300 relative group"
              style={activeStep === i ? {
                background: "hsl(0 0% 100% / 0.08)",
                border: "1px solid hsl(43 85% 47% / 0.35)",
              } : {
                background: "transparent",
                border: "1px solid transparent",
              }}
              onMouseEnter={e => {
                if (activeStep !== i) (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.04)";
              }}
              onMouseLeave={e => {
                if (activeStep !== i) (e.currentTarget as HTMLElement).style.background = "transparent";
              }}
            >
              {/* Step number */}
              <div
                className="text-4xl font-heading font-black mb-4 transition-colors"
                style={{ color: activeStep === i ? "hsl(43 85% 47%)" : "hsl(0 0% 100% / 0.15)" }}
              >
                {step.number}
              </div>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300"
                style={{
                  background: activeStep === i ? "hsl(43 85% 47% / 0.20)" : "hsl(0 0% 100% / 0.06)",
                  border: `1px solid ${activeStep === i ? "hsl(43 85% 47% / 0.40)" : "hsl(0 0% 100% / 0.10)"}`,
                }}
              >
                <step.icon
                  className="w-5 h-5 transition-colors"
                  style={{ color: activeStep === i ? "hsl(43 88% 68%)" : "hsl(0 0% 100% / 0.40)" }}
                />
              </div>
              <div
                className="text-sm font-heading font-semibold transition-colors leading-tight"
                style={{ color: activeStep === i ? "white" : "hsl(0 0% 100% / 0.45)" }}
              >
                {step.title}
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-px h-8 hidden lg:block"
                  style={{ background: "hsl(0 0% 100% / 0.10)" }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Active Step Detail */}
        <div
          className="max-w-3xl mx-auto p-10 rounded-3xl border"
          style={{
            background: "hsl(0 0% 100% / 0.05)",
            borderColor: "hsl(43 85% 47% / 0.25)",
          }}
        >
          <div className="flex items-start gap-6">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{
                background: "hsl(43 85% 47% / 0.15)",
                border: "1px solid hsl(43 85% 47% / 0.35)",
              }}
            >
              {React.createElement(steps[activeStep].icon, {
                className: "w-7 h-7",
                style: { color: "hsl(43 88% 68%)" }
              })}
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: "hsl(43 85% 47%)" }}>
                  Step {steps[activeStep].number}
                </div>
                <h3 className="text-2xl font-heading font-bold text-white">
                  {steps[activeStep].title}
                </h3>
              </div>
              <p className="text-white/70 leading-relaxed">
                {steps[activeStep].description}
              </p>
              <p className="text-white/50 text-sm leading-relaxed">
                {steps[activeStep].detail}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
