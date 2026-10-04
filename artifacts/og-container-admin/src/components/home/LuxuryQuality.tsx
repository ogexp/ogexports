import React from "react";
import { Award, CheckCircle, FlaskConical, Shield, Star, Microscope } from "lucide-react";

const CERTIFICATIONS = [
  {
    name: "SECP Registered",
    issuer: "Trade Development Authority of Pakistan",
    desc: "Pakistan's official trade authority license — mandatory for all registered exporters operating under national trade policy.",
    icon: Shield,
    color: "hsl(158 59% 15%)",
    bg: "hsl(158 59% 15% / 0.07)",
    border: "hsl(158 59% 15% / 0.20)",
  },
  {
    name: "Quality Assured",
    issuer: "International Organization for Standardization",
    desc: "Global standard for food safety management systems — covering our entire supply chain from farm procurement to export documentation.",
    icon: Award,
    color: "hsl(43 85% 47%)",
    bg: "hsl(43 85% 47% / 0.07)",
    border: "hsl(43 85% 47% / 0.22)",
  },
  {
    name: "Lab Tested",
    issuer: "Hazard Analysis Critical Control Points",
    desc: "Systematic preventive approach identifying physical, chemical, and biological hazards in production — required by EU and US importers.",
    icon: FlaskConical,
    color: "hsl(123 38% 42%)",
    bg: "hsl(123 38% 42% / 0.07)",
    border: "hsl(123 38% 42% / 0.20)",
  },
  {
    name: "SECP Registered",
    issuer: "Securities & Exchange Commission of Pakistan",
    desc: "Fully registered corporate entity under Pakistan's securities regulator — required for our investment platform operations.",
    icon: Star,
    color: "hsl(158 59% 15%)",
    bg: "hsl(158 59% 15% / 0.07)",
    border: "hsl(158 59% 15% / 0.20)",
  },
  {
    name: "Phytosanitary Certified",
    issuer: "National Plant Protection Organization",
    desc: "Every consignment carries a NPPO phytosanitary certificate confirming freedom from pests and diseases — mandatory for food imports.",
    icon: Microscope,
    color: "hsl(43 85% 47%)",
    bg: "hsl(43 85% 47% / 0.07)",
    border: "hsl(43 85% 47% / 0.22)",
  },
  {
    name: "PCSIR Lab Tested",
    issuer: "Pakistan Council of Scientific & Industrial Research",
    desc: "All commodity lots independently tested at PCSIR-accredited laboratories. Full COA issued with every shipment — no exceptions.",
    icon: CheckCircle,
    color: "hsl(123 38% 42%)",
    bg: "hsl(123 38% 42% / 0.07)",
    border: "hsl(123 38% 42% / 0.20)",
  },
];

const QA_STEPS = [
  { step: "01", title: "Pre-Harvest Inspection", desc: "Field visits and crop assessment before procurement" },
  { step: "02", title: "Arrival Testing", desc: "Moisture, purity, and contamination analysis on arrival" },
  { step: "03", title: "Storage Monitoring", desc: "Climate-controlled warehouses with daily quality checks" },
  { step: "04", title: "Pre-Loading Analysis", desc: "Final laboratory certification before container loading" },
  { step: "05", title: "Post-Loading Seal", desc: "Container sealing with official customs supervision" },
  { step: "06", title: "Destination Tracking", desc: "End-to-end monitoring until buyer receipt" },
];

export function LuxuryQuality() {
  return (
    <section
      className="py-28 lg:py-36 relative overflow-hidden"
      style={{ background: "hsl(158 59% 15%)" }}
    >
      {/* Decorative */}
      <div
        className="absolute top-0 right-0 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, hsl(43 85% 47% / 0.07) 0%, transparent 70%)",
          transform: "translate(40%, -40%)",
        }}
      />

      {/* Gold top line */}
      <div
        className="absolute top-0 inset-x-0 h-[1px]"
        style={{ background: "linear-gradient(to right, transparent, hsl(43 85% 47% / 0.5) 30%, hsl(43 85% 47% / 0.5) 70%, transparent)" }}
      />

      <div className="container relative z-10 px-4 md:px-6">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-20 items-start mb-20">
          <div className="space-y-5">
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase border"
              style={{
                background: "hsl(43 85% 47% / 0.12)",
                borderColor: "hsl(43 85% 47% / 0.30)",
                color: "hsl(43 88% 68%)",
              }}
            >
              Quality & Certifications
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold leading-[1.1] text-white">
              Zero Compromise
              <span className="block" style={{ color: "hsl(43 88% 68%)" }}>
                on Quality
              </span>
            </h2>
            <div className="w-16 h-[3px] rounded-full" style={{ background: "hsl(43 85% 47%)" }} />
            <p className="text-lg leading-relaxed text-white/60">
              Our multi-stage quality assurance protocol and internationally recognized
              certifications give buyers and investors complete confidence in every
              consignment that bears the OG Exports mark.
            </p>
          </div>

          {/* QA Process */}
          <div className="space-y-4">
            <div className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: "hsl(43 88% 68%)" }}>
              Our Quality Assurance Protocol
            </div>
            {QA_STEPS.map((step, i) => (
              <div
                key={i}
                className="flex items-start gap-4 p-4 rounded-2xl transition-all duration-300 group cursor-default"
                style={{
                  background: "hsl(0 0% 100% / 0.04)",
                  border: "1px solid hsl(0 0% 100% / 0.07)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(43 85% 47% / 0.10)";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(43 85% 47% / 0.25)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.04)";
                  (e.currentTarget as HTMLElement).style.borderColor = "hsl(0 0% 100% / 0.07)";
                }}
              >
                <div
                  className="text-sm font-black shrink-0 w-8 pt-0.5"
                  style={{ color: "hsl(43 85% 47%)" }}
                >
                  {step.step}
                </div>
                <div>
                  <div className="font-heading font-semibold text-white text-sm mb-1">{step.title}</div>
                  <div className="text-white/45 text-xs leading-relaxed">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Certifications Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {CERTIFICATIONS.map((cert, i) => (
            <div
              key={i}
              className="p-7 rounded-3xl border transition-all duration-300 group cursor-default"
              style={{
                background: "hsl(0 0% 100% / 0.04)",
                borderColor: "hsl(0 0% 100% / 0.08)",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = "hsl(43 85% 47% / 0.08)";
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(43 85% 47% / 0.28)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = "hsl(0 0% 100% / 0.04)";
                (e.currentTarget as HTMLElement).style.borderColor = "hsl(0 0% 100% / 0.08)";
                (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
              }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all"
                style={{
                  background: "hsl(43 85% 47% / 0.12)",
                  border: "1px solid hsl(43 85% 47% / 0.28)",
                }}
              >
                <cert.icon className="w-5 h-5" style={{ color: "hsl(43 88% 68%)" }} />
              </div>
              <div
                className="text-xs font-bold uppercase tracking-widest mb-2"
                style={{ color: "hsl(43 88% 68%)" }}
              >
                {cert.name}
              </div>
              <div className="text-white/40 text-xs mb-4">{cert.issuer}</div>
              <p className="text-white/60 text-sm leading-relaxed">{cert.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
