import { Link } from "wouter"
import { useEffect, useRef, useState } from "react"
import {
  ArrowRight, Globe, Leaf, ShieldCheck, Package, TrendingUp, Ship, Award,
  Users, Building2, BarChart2, Star, Anchor, FileCheck, Clock, Target,
  Heart, Zap, Handshake, BadgeCheck, CheckCircle2, MapPin, Phone, Mail,
  Quote, ChevronDown, Factory, Wheat, Scale, Microscope, Box, Truck,
  DollarSign, Layers, Sprout
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { getSiteSettings } from "@/lib/cms-data"

// ─── Brand constants ───────────────────────────────────────────────────────
const G   = "#0F3D2E"
const GL  = "#1a5a40"
const AU  = "#D4A012"
const OW  = "#F7F7F2"
const CH  = "#1F2933"
const CHL = "#2d3f50"

// ─── Section header ────────────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="h-px w-8 block" style={{ background: AU }} />
      <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: AU }}>{text}</span>
      <span className="h-px w-8 block" style={{ background: AU }} />
    </div>
  )
}

function GoldDivider({ className = "" }: { className?: string }) {
  return (
    <div className={`h-px w-24 mx-auto ${className}`} style={{ background: `linear-gradient(to right, transparent, ${AU}, transparent)` }} />
  )
}

// ─── Animated count-up hook (IntersectionObserver) ─────────────────────────
function useCountUp(target: number, suffix: string, duration = 1600) {
  const [display, setDisplay] = useState("0")
  const started = useRef(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const isDecimal = !Number.isInteger(target)
          const start = performance.now()
          const tick = (now: number) => {
            const p = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - p, 3)
            const val = eased * target
            setDisplay(isDecimal ? val.toFixed(1) : String(Math.round(val)))
            if (p < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, duration])

  return { ref, display }
}

// ─── Trade stat strip item ─────────────────────────────────────────────────
function TradeStatItem({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, display } = useCountUp(value, suffix)
  return (
    <div ref={ref} className="flex flex-col items-center gap-1 py-6 px-8">
      <div className="text-3xl md:text-4xl font-heading font-bold" style={{ color: AU }}>
        {display}{suffix}
      </div>
      <div className="text-xs uppercase tracking-[0.18em] font-medium" style={{ color: `${OW}80` }}>{label}</div>
    </div>
  )
}

// ─── Registration meta (icons + labels, numbers come from CMS) ─────────────
const REG_ENTRIES = [
  {
    key: "secp" as const,
    name: "SECP Registered",
    authority: "Securities & Exchange Commission of Pakistan",
    icon: Building2,
    badge: "SECP",
  },
  {
    key: "ntn" as const,
    name: "FBR — National Tax Number",
    authority: "Federal Board of Revenue, Pakistan",
    icon: DollarSign,
    badge: "NTN",
  },
  {
    key: "strn" as const,
    name: "Sales Tax Registration",
    authority: "Federal Board of Revenue, Pakistan",
    icon: Scale,
    badge: "STRN",
  },
  {
    key: "psw" as const,
    name: "Pakistan Single Window",
    authority: "Pakistan Single Window Authority",
    icon: Globe,
    badge: "PSW",
  },
  {
    key: "weboc" as const,
    name: "WeBOC Registered",
    authority: "Web-Based One Customs — Pakistan Customs",
    icon: Anchor,
    badge: "WeBOC",
  },
  {
    key: "chamber" as const,
    name: "Chamber of Commerce & Industry",
    authority: "Karachi Chamber of Commerce & Industry",
    icon: Handshake,
    badge: "KCCI",
  },
]

// Default registration numbers (fallback when CMS has no data yet)
const REG_DEFAULTS = {
  secp: "0112234", ntn: "2187456-7", strn: "1234567890123",
  psw: "PSW-2024-00891", weboc: "WEB-KHI-20240115", chamber: "KCCI-2024-11876",
}

function ComplianceSection() {
  const [regs, setRegs] = useState(() => {
    try { return getSiteSettings().registrations ?? REG_DEFAULTS } catch { return REG_DEFAULTS }
  })

  useEffect(() => {
    function sync() {
      try { setRegs(getSiteSettings().registrations ?? REG_DEFAULTS) } catch {}
    }
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])

  return (
    <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: G }}>
      {/* Subtle radial glow */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: `radial-gradient(ellipse 80% 50% at 50% 100%, ${AU}0d, transparent 70%)` }} />

      <div className="container mx-auto px-6 md:px-12 relative">
        {/* Header */}
        <div className="text-center mb-16">
          <SectionLabel text="Legal & Regulatory Standing" />
          <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>
            Company Registrations<br className="hidden sm:block" /> &amp; Compliance
          </h2>
          <p className="mt-5 text-base max-w-2xl mx-auto leading-relaxed" style={{ color: `${OW}75` }}>
            OG Exports (Private) Limited is a legally registered Pakistani export company operating in full compliance
            with national business and trade regulations. Our registrations demonstrate our commitment to transparency,
            legal compliance, and reliable international trade.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ background: `${AU}18`, border: `1px solid ${AU}40`, color: AU }}>
            <ShieldCheck className="w-3.5 h-3.5" />
            Fully Compliant · Legally Registered · SECP Certified
          </div>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {REG_ENTRIES.map((entry, i) => {
            const num = regs?.[entry.key] ?? REG_DEFAULTS[entry.key]
            return (
              <div
                key={entry.key}
                className="group relative flex flex-col gap-4 p-6 rounded-sm transition-all duration-300 cursor-default"
                style={{
                  background: `linear-gradient(135deg, ${CHL}f0 0%, ${CHL}b0 100%)`,
                  border: `1px solid ${AU}25`,
                  borderTop: `3px solid ${AU}`,
                  backdropFilter: "blur(10px)",
                  animationDelay: `${i * 80}ms`,
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = "translateY(-3px)"
                  el.style.boxShadow = `0 12px 40px ${AU}18`
                  el.style.borderColor = `${AU}70`
                  el.style.borderTopColor = AU
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = ""
                  el.style.boxShadow = ""
                  el.style.borderColor = `${AU}25`
                  el.style.borderTopColor = AU
                }}
              >
                {/* Header row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-sm"
                    style={{ background: `${AU}15`, border: `1px solid ${AU}35` }}>
                    <entry.icon className="w-5 h-5" style={{ color: AU }} />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#4CAF50" }} />
                    <span className="text-[9px] font-bold tracking-widest uppercase"
                      style={{ color: "#4CAF50" }}>Verified</span>
                  </div>
                </div>

                {/* Name + authority */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-heading font-bold text-[15px] leading-snug" style={{ color: OW }}>
                      {entry.name}
                    </span>
                    <span className="text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: `${AU}22`, color: AU, border: `1px solid ${AU}45` }}>
                      {entry.badge}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: `${OW}60` }}>{entry.authority}</p>
                </div>

                {/* Registration number */}
                <div className="pt-3 mt-auto" style={{ borderTop: `1px solid ${AU}18` }}>
                  <p className="text-[9px] uppercase tracking-[0.18em] font-semibold mb-1" style={{ color: `${AU}80` }}>
                    Registration Number
                  </p>
                  <p className="font-mono text-sm font-bold tracking-wider" style={{ color: OW }}>
                    {num}
                  </p>
                </div>

                {/* Corner checkmark */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <CheckCircle2 className="w-4 h-4" style={{ color: `${AU}80` }} />
                </div>
              </div>
            )
          })}
        </div>

        {/* Bottom trust bar */}
        <div className="mt-14 max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: ShieldCheck, title: "Full Legal Transparency", sub: "All registrations publicly verifiable through respective government authorities." },
            { icon: FileCheck,   title: "Export Authorised",       sub: "Licenced for international trade under Pakistan's Export Policy 2020." },
            { icon: BadgeCheck,  title: "Tax Compliant",           sub: "Active NTN & STRN — all tax obligations met with Federal Board of Revenue." },
          ].map(b => (
            <div key={b.title} className="flex items-start gap-3 p-4 rounded-sm"
              style={{ background: `${AU}08`, border: `1px solid ${AU}18` }}>
              <b.icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: AU }} />
              <div>
                <p className="text-sm font-semibold mb-0.5" style={{ color: OW }}>{b.title}</p>
                <p className="text-[11px] leading-relaxed" style={{ color: `${OW}60` }}>{b.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Certifications data ────────────────────────────────────────────────────
const CERTS = [
  { name: "ISO 9001:2015",    sub: "Quality Management System",       icon: ShieldCheck, badge: "ISO Certified"     },
  { name: "PSQCA Approved",   sub: "Pakistan Standards & QC Authority",icon: BadgeCheck,  badge: "PSQCA"             },
  { name: "HACCP Certified",  sub: "Hazard Analysis Critical Control", icon: Microscope,  badge: "Food Safety"       },
  { name: "FDA Registered",   sub: "U.S. Food & Drug Administration",  icon: FileCheck,   badge: "FDA"               },
  { name: "Organic (NOP)",    sub: "National Organic Program (USDA)",  icon: Leaf,        badge: "Organic"           },
  { name: "Halal Certified",  sub: "International Halal Certification",icon: Award,       badge: "Halal"             },
]

// ─── Data ─────────────────────────────────────────────────────────────────
const PRODUCTS = [
  {
    category: "Premium Basmati Rice",
    icon: Wheat,
    color: AU,
    variants: ["1121 White Rice", "1121 Steam Rice", "1121 Sella Rice", "1121 Double Steam Rice", "Super Kernel Basmati"],
    desc: "World-renowned long-grain aromatic rice grown in the fertile Punjab plains. Unmatched in fragrance, elongation, and quality.",
    image: "https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=600&q=80",
  },
  {
    category: "Non-Basmati Rice",
    icon: Wheat,
    color: "#8fbc8f",
    variants: ["IRRI-6 White Rice", "Long Grain Rice"],
    desc: "High-yield, affordable rice varieties for commodity buyers, food manufacturers, and government procurement.",
    image: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&q=80",
  },
  {
    category: "Yellow Maize",
    icon: Sprout,
    color: "#e8c547",
    variants: ["Food Grade", "Feed Grade", "Non-GMO"],
    desc: "Non-GMO yellow maize with high starch and protein content. Suitable for flour milling, animal feed, and food processing.",
    image: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=80",
  },
  {
    category: "Sesame Seeds",
    icon: Layers,
    color: "#d4a8a8",
    variants: ["Natural White", "Hulled White", "Red Sesame"],
    desc: "Premium export-grade sesame sourced from Pakistan's Sindh region. High oil content, meticulously cleaned and graded.",
    image: "https://images.unsplash.com/photo-1600880292089-90a7e086ee0c?w=600&q=80",
  },
  {
    category: "Fresh Potatoes",
    icon: Package,
    color: "#c8a96e",
    variants: ["Washed", "Unwashed"],
    desc: "Fresh farm-to-port potatoes from Punjab's agricultural belt. Available in retail and bulk export packing.",
    image: "https://images.unsplash.com/photo-1571184786922-10e4fb3a12c5?w=600&q=80",
  },
  {
    category: "Fresh Mangoes",
    icon: Leaf,
    color: "#e8a030",
    variants: ["Chaunsa", "Sindhri"],
    desc: "Pakistan's most celebrated mango varieties — Chaunsa and Sindhri — prized globally for sweetness and aroma.",
    image: "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=600&q=80",
  },
  {
    category: "Spices",
    icon: Zap,
    color: "#c8634a",
    variants: ["Black Pepper", "Cumin Seeds", "Turmeric", "Red Chilli", "Coriander", "Green Cardamom"],
    desc: "Authentic Pakistani spices sourced from artisan growers. Processed under strict hygiene standards for international food safety compliance.",
    image: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=600&q=80",
  },
]

const VALUES = [
  { icon: ShieldCheck, title: "Integrity",             desc: "Every transaction is conducted with absolute honesty and moral clarity." },
  { icon: BarChart2,   title: "Transparency",          desc: "Open communication with buyers, investors, and all stakeholders." },
  { icon: Clock,       title: "Reliability",           desc: "Consistent on-time delivery and unwavering supply chain performance." },
  { icon: Star,        title: "Quality",               desc: "Laboratory-tested products meeting EU, FDA, and Gulf food safety standards." },
  { icon: Leaf,        title: "Sustainability",        desc: "Responsible sourcing practices that protect Pakistan's agricultural future." },
  { icon: Zap,         title: "Innovation",            desc: "Continuously improving operations, packaging, and logistics capabilities." },
  { icon: Heart,       title: "Customer Commitment",  desc: "Our buyers' success is the ultimate measure of our own performance." },
  { icon: Award,       title: "Professionalism",       desc: "International-grade documentation, communication, and business conduct." },
  { icon: Handshake,   title: "Long-Term Partnerships",desc: "We invest in relationships, not just transactions." },
]

const INDUSTRIES = [
  { icon: Factory,    title: "Food Manufacturers"         },
  { icon: Package,    title: "Rice Importers"             },
  { icon: BarChart2,  title: "Commodity Traders"          },
  { icon: Layers,     title: "Feed Manufacturers"         },
  { icon: Building2,  title: "Wholesalers & Distributors" },
  { icon: ShieldCheck,title: "Retail Chains"              },
  { icon: Globe,      title: "Govt. Procurement Agencies" },
  { icon: Zap,        title: "FMCG Companies"             },
  { icon: TrendingUp, title: "Institutional Buyers"       },
]

const MARKETS = [
  { region: "Middle East",   flag: "🌙", countries: "UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, Oman, Jordan" },
  { region: "GCC",           flag: "⛽", countries: "Gulf Cooperation Council — full regional coverage" },
  { region: "Africa",        flag: "🌍", countries: "Nigeria, Kenya, Ethiopia, Egypt, South Africa, Senegal" },
  { region: "Europe",        flag: "🇪🇺", countries: "UK, Germany, Netherlands, France, Italy, Spain, Belgium" },
  { region: "Asia",          flag: "🌏", countries: "Sri Lanka, Bangladesh, Malaysia, Indonesia, Philippines" },
  { region: "North America", flag: "🌎", countries: "United States, Canada" },
  { region: "South America", flag: "🌎", countries: "Brazil, Argentina, Colombia" },
]

const WHY_CHOOSE = [
  { icon: Globe,       title: "Reliable Global Supply Chain", desc: "Direct farm access with verified logistics partners at Port Qasim." },
  { icon: Award,       title: "Premium Export Quality",       desc: "Every lot tested against EU, FDA, GCC, and buyer-specific standards." },
  { icon: DollarSign,  title: "Competitive FOB Pricing",      desc: "Transparent pricing directly from source, eliminating middlemen." },
  { icon: Box,         title: "Bulk Supply Capability",       desc: "Container and LCL shipments tailored to buyer volume requirements." },
  { icon: FileCheck,   title: "Professional Documentation",   desc: "Complete export document packages prepared in-house by our trade team." },
  { icon: Microscope,  title: "Strict Quality Inspection",    desc: "Third-party and in-house laboratory analysis before loading." },
  { icon: Package,     title: "Customized Packaging",         desc: "Branded, private-label, and custom-weight packaging available." },
  { icon: Truck,       title: "Timely Shipment",              desc: "Scheduled loading with shipment milestones recorded in the portal; live carrier data is not available." },
  { icon: Users,       title: "Customer-Centric Service",     desc: "Dedicated export managers for every account, every shipment." },
  { icon: Handshake,   title: "Long-Term Relationships",      desc: "We prioritize multi-year buyer partnerships over single transactions." },
]

const SUPPLY_CHAIN = [
  { step: 1, title: "Farm / Procurement",      desc: "Direct sourcing from verified farmers in Punjab and Sindh regions.",              icon: Sprout    },
  { step: 2, title: "Processing",              desc: "State-of-the-art rice mills, cleaning plants, and processing facilities.",        icon: Factory   },
  { step: 3, title: "Cleaning & Grading",      desc: "Mechanical sorting, gravity separation, and optical colour sorting.",             icon: Scale     },
  { step: 4, title: "Quality Inspection",      desc: "In-house and third-party lab testing against international food standards.",      icon: Microscope},
  { step: 5, title: "Packaging",               desc: "Customized packing as per buyer specification, private label available.",         icon: Box       },
  { step: 6, title: "Export Documentation",    desc: "Commercial invoice, packing list, COA, phytosanitary certificate, LC.",          icon: FileCheck },
  { step: 7, title: "Customs Clearance",       desc: "Full customs coordination and customs clearance at Port Qasim.",                  icon: BadgeCheck},
  { step: 8, title: "International Shipping",  desc: "FOB, CFR, and CIF shipments on major carrier routes globally.",                  icon: Ship      },
  { step: 9, title: "Customer Delivery",       desc: "Destination port arrival with full document handover and support.",              icon: Anchor    },
]

const QA_POINTS = [
  { icon: ShieldCheck, title: "Careful Product Selection", desc: "Only premium-grade lots cleared by our procurement team are accepted." },
  { icon: Microscope,  title: "Strict Inspection",         desc: "Multiple checkpoints: pre-loading, container stuffing, and post-shipment." },
  { icon: BarChart2,   title: "Moisture Control",          desc: "Monitored moisture levels throughout storage, processing, and packing." },
  { icon: Box,         title: "Professional Packaging",    desc: "Food-safe, UV-resistant packaging materials for long-distance export." },
  { icon: Scale,       title: "Loading Supervision",       desc: "Physical supervision at port during container stuffing and sealing." },
  { icon: FileCheck,   title: "Document Verification",     desc: "All export documents reviewed by senior trade compliance officers." },
  { icon: BadgeCheck,  title: "Buyer Compliance",          desc: "100% adherence to buyer-specific specifications, standards, and clauses." },
]

// ─── Main Component ────────────────────────────────────────────────────────
export default function CompanyProfile() {
  return (
    <div style={{ fontFamily: "'Outfit', sans-serif", color: OW }}>

      {/* ─── 1. HERO ──────────────────────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-20"
        style={{ background: G }}
      >
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: `radial-gradient(circle, ${OW} 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] opacity-10 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at top right, ${AU} 0%, transparent 70%)` }} />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] opacity-[0.08] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at bottom left, ${GL} 0%, transparent 70%)` }} />

        <div className="container mx-auto px-6 md:px-12 relative z-10">
          <div className="max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <span className="h-px w-12 block" style={{ background: AU }} />
              <span className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: AU }}>
                Corporate Company Profile
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-heading font-bold leading-[1.05] tracking-tight mb-8" style={{ color: OW }}>
              OG Exports<br />
              <span style={{ color: AU }}>(Private) Limited</span>
            </h1>

            <div className="h-px w-32 mb-8" style={{ background: AU }} />

            <p className="text-xl md:text-2xl font-light leading-relaxed mb-12 max-w-3xl" style={{ color: `${OW}cc` }}>
              Connecting Pakistan's Agricultural Excellence to the World.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16 pt-8" style={{ borderTop: `1px solid ${AU}30` }}>
              {[
                { value: "2020", label: "Established"     },
                { value: "40+",  label: "Export Markets"  },
                { value: "30+",  label: "Premium Products"},
                { value: "9+",   label: "Industries Served"},
              ].map(s => (
                <div key={s.label}>
                  <div className="text-4xl md:text-5xl font-heading font-bold mb-1" style={{ color: AU }}>{s.value}</div>
                  <div className="text-sm uppercase tracking-widest font-medium" style={{ color: `${OW}80` }}>{s.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              <Link href="/contact">
                <button
                  className="flex items-center gap-2 px-8 py-4 text-sm font-bold tracking-wider uppercase transition-all duration-300"
                  style={{ background: AU, color: CH, letterSpacing: "0.1em" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#d4b87a" }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = AU }}
                >
                  Enquire Now <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/products">
                <button
                  className="flex items-center gap-2 px-8 py-4 text-sm font-bold tracking-wider uppercase transition-all duration-300"
                  style={{ border: `1px solid ${AU}60`, color: AU, letterSpacing: "0.1em" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = AU }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${AU}60` }}
                >
                  Product Catalog
                </button>
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
          <span className="text-xs tracking-widest uppercase" style={{ color: AU }}>Scroll</span>
          <ChevronDown className="w-4 h-4 animate-bounce" style={{ color: AU }} />
        </div>
      </section>

      {/* ─── TRADE STATISTICS STRIP (between Hero & About) ─────────────────── */}
      <div style={{ background: CH, borderTop: `1px solid ${AU}25`, borderBottom: `1px solid ${AU}25` }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x" style={{ borderColor: `${AU}20` }}>
            <TradeStatItem value={40}   suffix="+"    label="Countries"  />
            <TradeStatItem value={30}   suffix="+"    label="Products"   />
            <TradeStatItem value={47}   suffix="M+"   label="$ Exports"  />
            <TradeStatItem value={5}    suffix="+"    label="Years"      />
          </div>
        </div>
      </div>

      {/* ─── 2. ABOUT ─────────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: CH }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel text="About OG Exports" />
              <h2 className="text-4xl md:text-5xl font-heading font-bold mb-8 leading-tight" style={{ color: OW }}>
                Pakistan's Premium<br />Agricultural Exporter
              </h2>
              <div className="space-y-5 text-base leading-relaxed" style={{ color: `${OW}b0` }}>
                <p>
                  OG Exports (Private) Limited is an international agricultural commodity exporter based in Pakistan. Founded on the legacy of Agrozee Global (Private) Limited and Usmania Traders — both operational since 2020 — we formally launched our global export brand in 2026 with a single mandate: to deliver Pakistan's agricultural excellence to the world's most demanding markets.
                </p>
                <p>
                  Headquartered in Depalpur City, Punjab — Pakistan's most fertile agricultural belt — we have direct farm-to-port access across the country's premier commodity zones, enabling us to maintain uncompromising control over quality, pricing, and supply continuity.
                </p>
                <p>
                  Our operations span 40+ export markets across the Middle East, GCC, Europe, Africa, Asia, and the Americas, with a growing portfolio of over 30 premium agricultural commodities.
                </p>
              </div>
              <div className="flex items-center gap-3 mt-10">
                <span className="h-px w-8" style={{ background: AU }} />
                <span className="text-sm font-bold tracking-widest uppercase" style={{ color: AU }}>
                  Est. 2020 · Depalpur City, Punjab, Pakistan
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-5">
              {[
                { icon: Globe,       title: "Global Reach",     value: "40+ Countries"       },
                { icon: Wheat,       title: "Product Range",    value: "30+ Commodities"     },
                { icon: ShieldCheck, title: "Quality Standard", value: "Quality Assured"     },
                { icon: Award,       title: "Compliance",       value: "SECP Registered"     },
                { icon: Ship,        title: "Shipping Terms",   value: "FOB · CFR · CIF"     },
                { icon: FileCheck,   title: "Documentation",    value: "Complete Packages"   },
              ].map(p => (
                <div key={p.title} className="p-5 rounded-sm" style={{ background: CHL, border: `1px solid ${AU}20` }}>
                  <p.icon className="w-5 h-5 mb-3" style={{ color: AU }} />
                  <div className="text-xs uppercase tracking-widest mb-1 font-medium" style={{ color: `${OW}60` }}>{p.title}</div>
                  <div className="text-sm font-bold" style={{ color: OW }}>{p.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPANY REGISTRATIONS & COMPLIANCE ───────────────────────────── */}
      <ComplianceSection />

      {/* ─── AWARDS & CERTIFICATIONS ──────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: CH }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-12">
            <SectionLabel text="Compliance & Quality" />
            <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>
              Awards &amp; Certifications
            </h2>
            <p className="mt-4 text-base max-w-2xl mx-auto" style={{ color: `${OW}80` }}>
              OG Exports upholds the highest international food safety, quality management, and export compliance standards.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {CERTS.map(c => (
              <div
                key={c.name}
                className="relative p-6 flex items-start gap-5 transition-all duration-300 group"
                style={{
                  background: CHL,
                  border: `1px solid ${AU}30`,
                  borderTop: `3px solid ${AU}`,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = AU }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderTopColor = AU; (e.currentTarget as HTMLDivElement).style.borderColor = `${AU}30`; (e.currentTarget as HTMLDivElement).style.borderTopColor = AU }}
              >
                {/* Icon */}
                <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-sm"
                  style={{ background: `${AU}15`, border: `1px solid ${AU}40` }}>
                  <c.icon className="w-6 h-6" style={{ color: AU }} />
                </div>
                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-heading font-bold text-base" style={{ color: OW }}>{c.name}</span>
                    <span
                      className="text-[9px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-full"
                      style={{ background: `${AU}20`, color: AU, border: `1px solid ${AU}40` }}
                    >
                      {c.badge}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: `${OW}70` }}>{c.sub}</p>
                </div>
                {/* Corner glow */}
                <div className="absolute top-3 right-3">
                  <CheckCircle2 className="w-4 h-4" style={{ color: `${AU}70` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 3. CEO MESSAGE ───────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: G }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <SectionLabel text="Founder & CEO Message" />

            <div className="flex justify-center mb-8">
              <svg width="80" height="60" viewBox="0 0 80 60" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M0 60V34C0 18.4 10.4 7.2 31.2 0L36 8.4C24 12.4 17.6 19.6 16.8 30H30V60H0ZM50 60V34C50 18.4 60.4 7.2 81.2 0L86 8.4C74 12.4 67.6 19.6 66.8 30H80V60H50Z" fill={AU} fillOpacity="0.3" />
              </svg>
            </div>

            <blockquote className="text-xl md:text-2xl font-light leading-relaxed mb-10 italic" style={{ color: `${OW}e0` }}>
              "At OG Exports, we do not simply ship commodities — we deliver certainty. Certainty of quality, certainty of compliance, and certainty of a long-term partner that honours its commitments. Pakistan possesses some of the world's finest agricultural land, and it is our mission to ensure that the world's buyers, investors, and institutions experience that excellence with every container we dispatch.
              <br /><br />
              We have built OG Exports to be more than an export company — it is a bridge between the rich agricultural heritage of Punjab and Sindh, and the global markets that demand the very best. As we grow, we remain anchored to our founding values: integrity, transparency, and an uncompromising commitment to excellence."
            </blockquote>

            <GoldDivider className="mb-8" />

            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-heading font-bold mb-3"
                style={{ background: `${AU}25`, border: `2px solid ${AU}60`, color: AU }}>
                OD
              </div>
              <div className="text-lg font-heading font-bold" style={{ color: OW }}>Osman Daula</div>
              <div className="text-sm tracking-widest uppercase" style={{ color: AU }}>Founder & Chief Executive Officer</div>
              <div className="text-sm" style={{ color: `${OW}70` }}>OG Exports (Private) Limited</div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 4. TIMELINE ──────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: CH }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <SectionLabel text="Company History" />
            <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>Our Journey</h2>
          </div>

          <div className="max-w-3xl mx-auto">
            <div className="relative">
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px"
                style={{ background: `linear-gradient(to bottom, ${AU}80, ${AU}30)` }} />

              {[
                {
                  year: "2020",
                  title: "Operations Commence",
                  body: "OG Exports' founding team begins agricultural commodity export operations under two established entities: Agrozee Global (Private) Limited and Usmania Traders — building relationships, supply chains, and market knowledge across the Middle East and GCC.",
                  side: "left",
                },
                {
                  year: "2022–2025",
                  title: "Market Expansion",
                  body: "Expansion into European, African, and Asian markets. Product portfolio grows to include Yellow Maize, Sesame Seeds, Fresh Mangoes, and premium Spices alongside our flagship Basmati Rice exports.",
                  side: "right",
                },
                {
                  year: "2026",
                  title: "OG Exports Brand Launch",
                  body: "OG Exports (Private) Limited is formally incorporated and launched as the unified international export brand — integrating the experience, networks, and operational expertise of six years of active commodity trading into a single, world-class organization.",
                  side: "left",
                },
              ].map((item, i) => (
                <div key={i} className={`relative flex items-center mb-16 last:mb-0 ${item.side === "right" ? "flex-row-reverse" : ""}`}>
                  <div className={`w-[calc(50%-2rem)] ${item.side === "right" ? "pl-8 text-left" : "pr-8 text-right"}`}>
                    <div className="text-3xl font-heading font-bold mb-2" style={{ color: AU }}>{item.year}</div>
                    <div className="text-lg font-heading font-semibold mb-3" style={{ color: OW }}>{item.title}</div>
                    <div className="text-sm leading-relaxed" style={{ color: `${OW}80` }}>{item.body}</div>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 z-10">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ background: G, borderColor: AU }}>
                      <div className="w-2 h-2 rounded-full" style={{ background: AU }} />
                    </div>
                  </div>
                  <div className="w-[calc(50%-2rem)]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 5. VISION & MISSION ──────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: G }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <SectionLabel text="Our Purpose" />
            <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>Vision &amp; Mission</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="p-10 relative overflow-hidden" style={{ background: CHL, border: `1px solid ${AU}30` }}>
              <div className="text-6xl font-heading font-black mb-6 opacity-10 absolute top-4 right-6 select-none" style={{ color: AU }}>V</div>
              <div className="flex items-center gap-3 mb-6">
                <Target className="w-6 h-6" style={{ color: AU }} />
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: AU }}>Vision</span>
              </div>
              <h3 className="text-2xl font-heading font-bold mb-4" style={{ color: OW }}>Our North Star</h3>
              <div className="h-px mb-6" style={{ background: `${AU}40` }} />
              <p className="text-base leading-relaxed" style={{ color: `${OW}c0` }}>
                To become one of Pakistan's most trusted and globally recognized agricultural export companies by delivering premium products, reliable supply chains, and long-term partnerships that create enduring value for our buyers, investors, and partner communities.
              </p>
            </div>

            <div className="p-10 relative overflow-hidden" style={{ background: GL, border: `1px solid ${AU}30` }}>
              <div className="text-6xl font-heading font-black mb-6 opacity-10 absolute top-4 right-6 select-none" style={{ color: AU }}>M</div>
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-6 h-6" style={{ color: AU }} />
                <span className="text-xs font-bold tracking-widest uppercase" style={{ color: AU }}>Mission</span>
              </div>
              <h3 className="text-2xl font-heading font-bold mb-4" style={{ color: OW }}>Our Daily Commitment</h3>
              <div className="h-px mb-6" style={{ background: `${AU}40` }} />
              <p className="text-base leading-relaxed" style={{ color: `${OW}c0` }}>
                To connect Pakistan's agricultural excellence with international markets by supplying premium-quality commodities while maintaining integrity, transparency, professionalism, and complete customer satisfaction throughout every stage of the export process.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 6. CORE VALUES ───────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: CH }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <SectionLabel text="What We Stand For" />
            <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>Core Values</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {VALUES.map(v => (
              <div key={v.title} className="p-8 group transition-all duration-300"
                style={{ background: CHL, borderTop: `2px solid ${AU}`, borderLeft: `1px solid ${AU}20`, borderRight: `1px solid ${AU}20`, borderBottom: `1px solid ${AU}20` }}>
                <v.icon className="w-6 h-6 mb-5" style={{ color: AU }} />
                <h3 className="text-lg font-heading font-bold mb-3" style={{ color: OW }}>{v.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: `${OW}80` }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 7. PRODUCT PORTFOLIO ─────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: G }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="mb-16">
            <SectionLabel text="Export Portfolio" />
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <h2 className="text-4xl md:text-5xl font-heading font-bold leading-tight" style={{ color: OW }}>
                Premium Product<br />Portfolio
              </h2>
              <Link href="/products">
                <button className="flex items-center gap-2 px-6 py-3 text-xs font-bold tracking-widest uppercase transition-all duration-200"
                  style={{ border: `1px solid ${AU}50`, color: AU }}>
                  View Full Catalog <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {PRODUCTS.map(p => (
              <div key={p.category} className="group overflow-hidden transition-all duration-300"
                style={{ background: CHL, border: `1px solid ${AU}20` }}>
                <div className="aspect-[16/9] overflow-hidden relative">
                  <img src={p.image} alt={p.category}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0" style={{ background: `linear-gradient(to top, ${CH}d0, transparent)` }} />
                  <div className="absolute bottom-4 left-4">
                    <span className="text-xs font-bold tracking-widest uppercase px-3 py-1" style={{ background: AU, color: CH }}>
                      {p.category}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-sm leading-relaxed mb-5" style={{ color: `${OW}90` }}>{p.desc}</p>
                  <div className="space-y-1.5">
                    {p.variants.map(v => (
                      <div key={v} className="flex items-center gap-2 text-sm" style={{ color: `${OW}b0` }}>
                        <div className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: AU }} />
                        {v}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 8. INDUSTRIES WE SERVE ───────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: CH }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <SectionLabel text="Our Market" />
            <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>Industries We Serve</h2>
            <p className="mt-4 text-base max-w-2xl mx-auto" style={{ color: `${OW}80` }}>
              OG Exports supplies verified, export-grade commodities to some of the world's most demanding industries and institutional buyers.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 max-w-4xl mx-auto">
            {INDUSTRIES.map(ind => (
              <div key={ind.title}
                className="flex items-center gap-4 p-6 transition-all duration-200 group"
                style={{ background: CHL, border: `1px solid ${AU}20` }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${AU}60` }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${AU}20` }}>
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 rounded-sm" style={{ background: `${AU}15` }}>
                  <ind.icon className="w-5 h-5" style={{ color: AU }} />
                </div>
                <span className="text-sm font-medium leading-tight" style={{ color: OW }}>{ind.title}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 9. GLOBAL MARKETS ────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: G }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <SectionLabel text="Our Footprint" />
            <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>Global Export Markets</h2>
            <p className="mt-4 text-base max-w-2xl mx-auto" style={{ color: `${OW}80` }}>
              OG Exports supplies 40+ countries across seven major trade regions, with established buyer networks and logistics corridors in each.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto mb-14 py-8 px-8" style={{ background: CHL, border: `1px solid ${AU}30` }}>
            {[
              { val: "40+", lab: "Export Markets"      },
              { val: "7",   lab: "Global Regions"      },
              { val: "30+", lab: "Commodities Exported"},
            ].map(s => (
              <div key={s.lab} className="text-center">
                <div className="text-3xl font-heading font-bold" style={{ color: AU }}>{s.val}</div>
                <div className="text-xs uppercase tracking-wider mt-1" style={{ color: `${OW}70` }}>{s.lab}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {MARKETS.map(m => (
              <div key={m.region} className="p-6 transition-all duration-200"
                style={{ background: CHL, border: `1px solid ${AU}25`, borderLeft: `3px solid ${AU}` }}>
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{m.flag}</span>
                  <span className="font-heading font-bold text-base" style={{ color: OW }}>{m.region}</span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: `${OW}70` }}>{m.countries}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 10. WHY CHOOSE US ────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: CH }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="mb-16">
            <SectionLabel text="Our Advantage" />
            <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>
              Why Choose<br />OG Exports
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-x-16 gap-y-8 max-w-5xl">
            {WHY_CHOOSE.map(w => (
              <div key={w.title} className="flex items-start gap-5 group">
                <div className="w-10 h-10 flex items-center justify-center flex-shrink-0 mt-0.5 rounded-sm transition-all duration-200"
                  style={{ background: `${AU}15`, border: `1px solid ${AU}40` }}>
                  <w.icon className="w-5 h-5" style={{ color: AU }} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base mb-1" style={{ color: OW }}>{w.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: `${OW}80` }}>{w.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 11. SUPPLY CHAIN ─────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: G }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <SectionLabel text="End-to-End Operations" />
            <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>Supply Chain Process</h2>
            <p className="mt-4 text-base max-w-2xl mx-auto" style={{ color: `${OW}80` }}>
              From farm procurement in Punjab to customer delivery at destination port — every step monitored, documented, and delivered on schedule.
            </p>
          </div>

          <div className="max-w-3xl mx-auto relative">
            <div className="absolute left-6 md:left-8 top-0 bottom-0 w-px"
              style={{ background: `linear-gradient(to bottom, ${AU}80, ${AU}20)` }} />

            <div className="space-y-0">
              {SUPPLY_CHAIN.map((s, i) => (
                <div key={s.step} className="flex items-start gap-8 pb-10 last:pb-0 relative">
                  <div className="w-12 h-12 md:w-16 md:h-16 flex-shrink-0 flex items-center justify-center rounded-sm relative z-10"
                    style={{ background: CHL, border: `1px solid ${AU}50` }}>
                    <s.icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: AU }} />
                    <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                      style={{ background: AU, color: CH }}>{s.step}</div>
                  </div>
                  <div className="pt-3 flex-1">
                    <h3 className="font-heading font-bold text-lg mb-1" style={{ color: OW }}>{s.title}</h3>
                    <p className="text-sm leading-relaxed" style={{ color: `${OW}80` }}>{s.desc}</p>
                    {i < SUPPLY_CHAIN.length - 1 && (
                      <div className="flex items-center gap-2 mt-4">
                        <ChevronDown className="w-4 h-4" style={{ color: `${AU}60` }} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 12. QUALITY ASSURANCE ────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: CH }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <SectionLabel text="Our Standard" />
              <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 leading-tight" style={{ color: OW }}>
                Quality<br />Assurance
              </h2>
              <p className="text-base leading-relaxed mb-8" style={{ color: `${OW}90` }}>
                Quality is not a final checkpoint — it is embedded at every stage of our supply chain. From farm selection through customs clearance, OG Exports maintains rigorous inspection protocols validated by both our internal team and certified third-party laboratories.
              </p>
              <div className="flex items-center gap-3">
                <span className="h-px w-8" style={{ background: AU }} />
                <span className="text-xs uppercase tracking-widest font-bold" style={{ color: AU }}>SECP Registered · Export Licensed</span>
              </div>
            </div>

            <div className="space-y-4">
              {QA_POINTS.map(q => (
                <div key={q.title} className="flex items-start gap-5 p-5"
                  style={{ background: CHL, border: `1px solid ${AU}20` }}>
                  <q.icon className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: AU }} />
                  <div>
                    <div className="font-bold text-sm mb-1" style={{ color: OW }}>{q.title}</div>
                    <div className="text-xs leading-relaxed" style={{ color: `${OW}70` }}>{q.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── 13. LOGISTICS ────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: G }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="text-center mb-16">
            <SectionLabel text="Trade Terms" />
            <h2 className="text-4xl md:text-5xl font-heading font-bold" style={{ color: OW }}>Logistics &amp; Shipping</h2>
            <p className="mt-4 text-base max-w-2xl mx-auto" style={{ color: `${OW}80` }}>
              OG Exports offers flexible international shipping terms to accommodate buyer preferences and country-specific import requirements.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
            {[
              { term: "FOB", full: "Free On Board",           icon: Anchor,     desc: "Buyer assumes responsibility once goods are loaded aboard the vessel at Port Qasim. Ideal for buyers with preferred freight arrangements.", suitable: "Commodity traders, large importers" },
              { term: "CFR", full: "Cost & Freight",          icon: Ship,       desc: "OG Exports covers the cost of goods and ocean freight to the destination port. Insurance responsibility transfers to buyer after loading.", suitable: "Mid-size importers, regional buyers" },
              { term: "CIF", full: "Cost, Insurance & Freight",icon: ShieldCheck,desc: "Comprehensive term: OG Exports manages cost, freight, and marine insurance to destination. Maximum convenience for buyers.", suitable: "New buyers, government procurement" },
            ].map(t => (
              <div key={t.term} className="p-8 text-center" style={{ background: CHL, border: `1px solid ${AU}30` }}>
                <div className="w-16 h-16 mx-auto flex items-center justify-center mb-6 rounded-sm"
                  style={{ background: `${AU}15`, border: `1px solid ${AU}50` }}>
                  <t.icon className="w-7 h-7" style={{ color: AU }} />
                </div>
                <div className="text-3xl font-heading font-black mb-1" style={{ color: AU }}>{t.term}</div>
                <div className="text-xs uppercase tracking-widest mb-5" style={{ color: `${OW}70` }}>{t.full}</div>
                <div className="h-px mb-5" style={{ background: `${AU}30` }} />
                <p className="text-sm leading-relaxed mb-5" style={{ color: `${OW}90` }}>{t.desc}</p>
                <div className="text-xs" style={{ color: `${AU}c0` }}>
                  <span className="font-bold">Best for: </span>{t.suitable}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center text-sm" style={{ color: `${OW}80` }}>
            Air freight available for fresh produce. All shipments originate from <span style={{ color: AU }}>Port Qasim, Karachi</span>.
          </div>
        </div>
      </section>

      {/* ─── 14. BUSINESS PHILOSOPHY ──────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: CH }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="max-w-4xl mx-auto text-center">
            <SectionLabel text="Our Philosophy" />
            <GoldDivider className="mb-10" />
            <blockquote className="text-2xl md:text-3xl lg:text-4xl font-heading font-light leading-[1.4] italic" style={{ color: OW }}>
              "Our business is built on trust, quality, transparency, professionalism, and long-term partnerships.
              <span style={{ color: AU }}> Every shipment reflects our commitment to excellence.</span>"
            </blockquote>
            <GoldDivider className="mt-10" />
          </div>
        </div>
      </section>

      {/* ─── 15. CALL TO ACTION ───────────────────────────────────────────── */}
      <section className="py-24 md:py-32 relative overflow-hidden" style={{ background: G }}>
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: `radial-gradient(circle, ${OW} 1px, transparent 1px)`, backgroundSize: "32px 32px" }} />
        <div className="absolute inset-0"
          style={{ background: `radial-gradient(ellipse 60% 50% at 50% 50%, ${GL} 0%, transparent 70%)` }} />

        <div className="container mx-auto px-6 md:px-12 relative z-10 text-center">
          <SectionLabel text="Partner With Us" />
          <h2 className="text-4xl md:text-6xl font-heading font-bold mb-6 leading-tight" style={{ color: OW }}>
            Ready to Source<br />
            <span style={{ color: AU }}>Premium Pakistani</span><br />
            Commodities?
          </h2>
          <p className="text-lg max-w-2xl mx-auto mb-12" style={{ color: `${OW}c0` }}>
            Whether you are a commodity importer, food manufacturer, retail chain, or government procurement agency — OG Exports has the product quality, supply reliability, and export expertise to meet your requirements.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <Link href="/contact">
              <button className="flex items-center gap-2 px-10 py-4 text-sm font-bold tracking-widest uppercase"
                style={{ background: AU, color: CH }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#d4b87a" }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = AU }}>
                Submit an Enquiry <ArrowRight className="w-4 h-4" />
              </button>
            </Link>
            <Link href="/products">
              <button className="flex items-center gap-2 px-10 py-4 text-sm font-bold tracking-widest uppercase"
                style={{ border: `1px solid ${AU}60`, color: AU }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = AU }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = `${AU}60` }}>
                Browse Products
              </button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 mt-16 pt-12" style={{ borderTop: `1px solid ${AU}25` }}>
            {["SECP Registered", "Export Licensed", "Quality Assured", "Lab Tested", "40+ Export Markets"].map(b => (
              <div key={b} className="flex items-center gap-2 text-xs uppercase tracking-widest font-medium" style={{ color: `${OW}80` }}>
                <CheckCircle2 className="w-3.5 h-3.5" style={{ color: AU }} />
                {b}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 16. CONTACT ──────────────────────────────────────────────────── */}
      <section className="py-24 md:py-32" style={{ background: CH }}>
        <div className="container mx-auto px-6 md:px-12">
          <div className="grid md:grid-cols-2 gap-16 items-start">
            <div>
              <img src={`${import.meta.env.BASE_URL}og-logo.png`} alt="OG Exports" className="h-14 mb-8" />
              <p className="text-base leading-relaxed mb-8 max-w-sm" style={{ color: `${OW}90` }}>
                OG Exports (Private) Limited is Pakistan's premium international agricultural commodity exporter, connecting the world's buyers to Pakistan's finest produce.
              </p>
              <div className="h-px w-16 mb-8" style={{ background: AU }} />
              <div className="text-sm space-y-1" style={{ color: `${OW}70` }}>
                <div style={{ color: AU }} className="font-bold text-base font-heading">Osman Daula</div>
                <div>Founder &amp; Chief Executive Officer</div>
                <div>OG Exports (Private) Limited</div>
                <div>Depalpur City, Punjab, Pakistan</div>
              </div>
            </div>

            <div>
              <SectionLabel text="Get In Touch" />
              <h2 className="text-3xl font-heading font-bold mb-10" style={{ color: OW }}>Contact Information</h2>

              <div className="space-y-5">
                {[
                  { icon: Phone, label: "Phone / WhatsApp", value: "+92 303 256 9000",    href: "https://wa.me/923032569000"          },
                  { icon: Mail,  label: "General Email",    value: "info@ogexports.co",   href: "mailto:info@ogexports.co"            },
                  { icon: Mail,  label: "Sales Enquiries",  value: "sales@ogexports.co",  href: "mailto:sales@ogexports.co"           },
                  { icon: Mail,  label: "Export Enquiries", value: "export@ogexports.co", href: "mailto:export@ogexports.co"          },
                  { icon: Globe, label: "Website",          value: "www.ogexports.co",    href: "https://www.ogexports.co"            },
                  { icon: MapPin,label: "Location",         value: "Depalpur City, Punjab, Pakistan", href: null                     },
                ].map(c => (
                  <div key={c.label} className="flex items-start gap-5 p-5"
                    style={{ background: CHL, border: `1px solid ${AU}20` }}>
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: `${AU}15` }}>
                      <c.icon className="w-5 h-5" style={{ color: AU }} />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-widest mb-1 font-medium" style={{ color: `${OW}60` }}>{c.label}</div>
                      {c.href ? (
                        <a href={c.href} className="text-sm font-medium transition-colors duration-200" style={{ color: OW }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = AU }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = OW }}>
                          {c.value}
                        </a>
                      ) : (
                        <div className="text-sm font-medium" style={{ color: OW }}>{c.value}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom strip */}
      <div className="py-6 text-center text-xs" style={{ background: G, color: `${OW}50`, borderTop: `1px solid ${AU}25` }}>
        © {new Date().getFullYear()} OG Exports (Private) Limited · All Rights Reserved ·{" "}
        <span style={{ color: AU }}>info@ogexports.co</span>
      </div>

    </div>
  )
}
