import { motion } from "framer-motion"
import { Shield, Award, CheckCircle2, Star, Globe, FileCheck, Leaf, TrendingUp } from "lucide-react"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"
const OFFWHITE = "#F7F7F2"
const CHARCOAL = "#1F2933"

const CERTS = [
  {
    icon: Shield,
    code: "HACCP",
    name: "Hazard Analysis Critical Control Point",
    authority: "International Food Safety Authority",
    scope: "Full supply chain — farm to port",
    description: "Internationally recognized food safety management system ensuring systematic preventive approach to biological, chemical, and physical hazards.",
    color: GREEN,
    badge: "Food Safety",
  },
  {
    icon: Award,
    code: "ISO 9001:2015",
    name: "Quality Management System",
    authority: "International Organization for Standardization",
    scope: "All export operations",
    description: "Global benchmark for quality management systems — ensuring consistent, high-quality products and services that meet customer and regulatory requirements.",
    color: GOLD,
    badge: "Quality",
  },
  {
    icon: Leaf,
    code: "ISO 22000",
    name: "Food Safety Management System",
    authority: "International Organization for Standardization",
    scope: "Agricultural commodities",
    description: "Comprehensive food safety management standard combining HACCP principles with prerequisite programs for complete food chain control.",
    color: "#4CAF50",
    badge: "Quality Standard",
  },
  {
    icon: Globe,
    code: "FDA Registered",
    name: "U.S. Food & Drug Administration",
    authority: "United States Federal Government",
    scope: "All U.S.-bound shipments",
    description: "Official FDA registration enabling direct export of food commodities to the United States market with full regulatory compliance.",
    color: "#2196F3",
    badge: "U.S. Market",
  },
  {
    icon: FileCheck,
    code: "SECP",
    name: "Securities & Exchange Commission",
    authority: "Government of Pakistan",
    scope: "Corporate & investor operations",
    description: "Registered with Pakistan's apex regulatory body for corporate affairs, ensuring full legal compliance and investor protection framework.",
    color: GOLD,
    badge: "Corporate",
  },
  {
    icon: TrendingUp,
    code: "TDAP",
    name: "Trade Development Authority",
    authority: "Ministry of Commerce, Pakistan",
    scope: "All export commodities",
    description: "Certified exporter recognized by Pakistan's Trade Development Authority for premium agricultural commodity exports to global markets.",
    color: GREEN,
    badge: "Export",
  },
]

const STATS = [
  { value: "6+", label: "Active Certifications" },
  { value: "40+", label: "Export Markets" },
  { value: "100%", label: "Compliance Rate" },
  { value: "5+", label: "Years Certified" },
]

const STANDARDS = [
  "Codex Alimentarius (FAO/WHO)",
  "EU MRL Pesticide Regulations",
  "SPS Agreement (WTO)",
  "EUREPGAP / GlobalG.A.P.",
  "Pakistan Standards & Quality Control Authority (PSQCA)",
  "Phytosanitary Certification (NPPOs)",
]

export default function Certifications() {
  return (
    <div className="min-h-screen" style={{ background: OFFWHITE }}>

      {/* ── HERO ── */}
      <section style={{ background: `linear-gradient(135deg, ${EMERALD} 0%, #1a5c40 100%)`, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(circle at 20% 50%, ${GOLD}12 0%, transparent 60%), radial-gradient(circle at 80% 20%, ${GREEN}10 0%, transparent 50%)` }} />
        <div style={{ position: "absolute", top: 0, right: 0, width: "40%", height: "100%", opacity: 0.04, backgroundImage: `repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 24px)` }} />

        <div className="container px-4 md:px-6 py-24 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-widest uppercase mb-6"
              style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40`, color: GOLD }}>
              <Shield className="w-3.5 h-3.5" />
              Compliance & Quality Assurance
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight" style={{ color: "white" }}>
              Certified for<br />
              <span style={{ color: GOLD }}>Global Trade.</span>
            </h1>
            <p className="text-lg max-w-2xl mb-10 leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
              Every certificate we hold represents a commitment to quality, safety, and integrity — from Pakistan's agricultural heartland to international markets across 40+ countries.
            </p>
            {/* Stats bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl">
              {STATS.map(s => (
                <div key={s.label} className="text-center py-3 px-4 rounded-xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="text-2xl font-bold mb-0.5" style={{ color: GOLD }}>{s.value}</div>
                  <div className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{s.label}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── CERTIFICATIONS GRID ── */}
      <section className="container px-4 md:px-6 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: CHARCOAL }}>Our Certifications</h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#6B7280" }}>
            Verified by international and Pakistani authorities — giving our global buyers complete confidence in every shipment.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {CERTS.map((cert, i) => {
            const Icon = cert.icon
            return (
              <motion.div key={cert.code}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.08 }} viewport={{ once: true }}
                whileHover={{ y: -4, boxShadow: `0 16px 40px ${cert.color}18` }}
                className="rounded-2xl p-6 flex flex-col transition-all duration-300 cursor-default"
                style={{ background: "white", border: `1px solid rgba(0,0,0,0.07)`, boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>

                {/* Top badge + icon */}
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: `${cert.color}15` }}>
                    <Icon className="w-6 h-6" style={{ color: cert.color }} />
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: `${cert.color}12`, color: cert.color }}>
                    {cert.badge}
                  </span>
                </div>

                {/* Code + name */}
                <div className="mb-3">
                  <div className="text-xs font-bold tracking-widest uppercase mb-1" style={{ color: cert.color }}>{cert.code}</div>
                  <h3 className="text-lg font-bold leading-snug" style={{ color: CHARCOAL }}>{cert.name}</h3>
                </div>

                {/* Description */}
                <p className="text-sm leading-relaxed flex-1 mb-4" style={{ color: "#6B7280" }}>{cert.description}</p>

                {/* Footer */}
                <div className="pt-4" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
                  <div className="flex items-center gap-1.5 text-xs mb-1" style={{ color: "#9CA3AF" }}>
                    <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" style={{ color: GREEN }} />
                    <span className="font-medium">{cert.authority}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: "#9CA3AF" }}>
                    <Globe className="w-3 h-3 flex-shrink-0" />
                    {cert.scope}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </section>

      {/* ── COMPLIANCE STANDARDS ── */}
      <section className="py-20" style={{ background: "white" }}>
        <div className="container px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-5"
                style={{ background: `${GREEN}12`, color: EMERALD }}>
                <Star className="w-3 h-3" />
                International Standards
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-5 leading-tight" style={{ color: CHARCOAL }}>
                Aligned with<br /><span style={{ color: EMERALD }}>Global Frameworks</span>
              </h2>
              <p className="text-base mb-8 leading-relaxed" style={{ color: "#6B7280" }}>
                Beyond our core certifications, OG Exports operates in full alignment with international trade and food safety frameworks — ensuring market access and regulatory confidence across every destination country.
              </p>
              <div className="space-y-3">
                {STANDARDS.map((s, i) => (
                  <motion.div key={s} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }} viewport={{ once: true }}
                    className="flex items-center gap-3 py-3 px-4 rounded-xl"
                    style={{ background: `${EMERALD}06`, border: `1px solid ${EMERALD}12` }}>
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: GREEN }} />
                    <span className="text-sm font-medium" style={{ color: CHARCOAL }}>{s}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.15 }} viewport={{ once: true }}>
              <div className="rounded-3xl p-8 md:p-10"
                style={{ background: `linear-gradient(135deg, ${EMERALD} 0%, #1a5c40 100%)`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, right: 0, width: "60%", height: "100%", opacity: 0.04, backgroundImage: `repeating-linear-gradient(45deg, white 0px, white 1px, transparent 1px, transparent 20px)` }} />
                <div className="relative">
                  <Shield className="w-12 h-12 mb-6" style={{ color: GOLD }} />
                  <h3 className="text-2xl font-bold mb-3" style={{ color: "white" }}>Quality Guarantee</h3>
                  <p className="text-sm leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.65)" }}>
                    Every shipment leaving OG Exports undergoes multi-stage quality inspection — from farm sourcing and warehouse processing to pre-shipment laboratory testing and phytosanitary clearance.
                  </p>
                  <div className="space-y-4">
                    {[
                      { step: "01", label: "Farm-level sourcing verification" },
                      { step: "02", label: "Warehouse processing & grading" },
                      { step: "03", label: "Pre-shipment lab testing" },
                      { step: "04", label: "Phytosanitary & customs clearance" },
                      { step: "05", label: "Recorded shipment milestones" },
                    ].map(item => (
                      <div key={item.step} className="flex items-center gap-4">
                        <span className="text-xs font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: `${GOLD}20`, color: GOLD, border: `1px solid ${GOLD}40` }}>
                          {item.step}
                        </span>
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── TRUST BANNER ── */}
      <section className="py-16" style={{ background: `linear-gradient(90deg, ${EMERALD}08 0%, ${GOLD}08 100%)`, borderTop: `1px solid ${EMERALD}12`, borderBottom: `1px solid ${EMERALD}12` }}>
        <div className="container px-4 md:px-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <p className="text-sm font-semibold tracking-widest uppercase mb-4" style={{ color: GOLD }}>Trusted Worldwide</p>
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: CHARCOAL }}>
              Every certificate. Every audit. Every shipment.
            </h2>
            <p className="text-base max-w-lg mx-auto mb-8" style={{ color: "#6B7280" }}>
              Our certification portfolio is maintained, renewed, and audited annually — giving buyers in 40+ markets ongoing confidence in OG Exports compliance.
            </p>
            <a href="/contact"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full text-sm font-semibold transition-all"
              style={{ background: EMERALD, color: "white" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "#1a5c40"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = EMERALD}>
              <FileCheck className="w-4 h-4" />
              Request Certificate Copies
            </a>
          </motion.div>
        </div>
      </section>

    </div>
  )
}
