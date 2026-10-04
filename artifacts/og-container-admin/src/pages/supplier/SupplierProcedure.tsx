import { Link } from "wouter"
import { SupplierPortalLayout } from "@/components/supplier/SupplierPortalLayout"
import { useCurrency, isPakistanCountry } from "@/lib/use-currency"
import {
  UserCheck, FileText, Package, FlaskConical, ClipboardCheck,
  Handshake, Box, Search, Plane, Banknote, Star,
  CheckCircle2, ChevronRight, Info, Globe, MapPin
} from "lucide-react"

// ─── Step data ────────────────────────────────────────────────────────────────
interface Step {
  num: number
  title: string
  subtitle: string
  icon: React.ElementType
  color: string
  duration: string
  cost: (isPK: boolean) => string
  details: string[]
  docs?: string[]
  tip?: string
}

const STEPS: Step[] = [
  {
    num: 1,
    title: "Account Registration",
    subtitle: "Create your OG Exports supplier account",
    icon: UserCheck,
    color: "#10b981",
    duration: "5 – 10 minutes",
    cost: () => "Free",
    details: [
      "Visit ogexports.co and click Register",
      "Select 'Supplier' as your account type",
      "Enter your full name, email, phone, and country",
      "Set a strong password (min. 8 characters)",
      "Accept the Terms & Conditions and Privacy Policy",
      "You are automatically logged in after registration",
    ],
    tip: "Use your official business email address for faster KYC approval.",
  },
  {
    num: 2,
    title: "Business Profile & KYC",
    subtitle: "Verify your identity and business details",
    icon: FileText,
    color: "#3b82f6",
    duration: "1 – 2 business days",
    cost: () => "Free",
    details: [
      "Go to Supplier Portal → Company Profile",
      "Fill in your business name, address, and registration details",
      "Upload required KYC documents (see document list below)",
      "Submit for admin review",
      "You will receive email confirmation once verified",
    ],
    docs: [
      "National ID / Passport (owner)",
      "Business Registration Certificate",
      "NTN Certificate (Pakistan) / Tax ID",
      "Bank Account Details (for payment)",
      "STRN Certificate (if applicable)",
    ],
    tip: "Incomplete documents are the #1 cause of KYC delay. Double-check all uploads before submitting.",
  },
  {
    num: 3,
    title: "Product Offer Submission",
    subtitle: "List your agricultural commodities on the platform",
    icon: Package,
    color: "#f59e0b",
    duration: "15 – 30 minutes per offer",
    cost: () => "Free",
    details: [
      "Go to Supplier Portal → Submit New Offer",
      "Step 1 – Product Info: select category, origin, and write a full description",
      "Step 2 – Pricing & Terms: enter FOB price, MOQ, payment terms, and Incoterms",
      "Step 3 – Review & Submit your offer for admin approval",
      "You can submit multiple offers for different commodities",
      "Track offer status in My Offers (Pending / Approved / On Hold / Rejected)",
    ],
    tip: "Offers with complete descriptions, accurate pricing, and high-quality details get approved faster.",
  },
  {
    num: 4,
    title: "Sample & Quality Verification",
    subtitle: "Provide physical samples for quality assessment",
    icon: FlaskConical,
    color: "#8b5cf6",
    duration: "3 – 7 business days",
    cost: (isPK) => isPK
      ? "Lab Testing: PKR 15,000 – 25,000 per commodity\nSample Courier: PKR 500 – 2,000"
      : "Lab Testing: $50 – $120 per commodity\nSample Courier: $20 – $80",
    details: [
      "OG Exports may request a physical sample of your commodity",
      "Ship the sample to our Karachi warehouse address",
      "Sample is sent to a certified lab for quality testing",
      "Lab tests cover: moisture, purity, pesticide residues, and grading",
      "Results are shared with you within 3–5 working days",
      "Approved samples become your product quality benchmark",
    ],
    docs: [
      "Sample shipment invoice",
      "Packing list for sample",
      "Lab test report (if you already have one)",
    ],
    tip: "Suppliers who proactively share existing lab reports speed up this step significantly.",
  },
  {
    num: 5,
    title: "Offer Review & Admin Approval",
    subtitle: "OG Exports team evaluates and approves your offer",
    icon: ClipboardCheck,
    color: "#06b6d4",
    duration: "3 – 7 business days",
    cost: () => "Free",
    details: [
      "Admin reviews pricing, quality, and documentation",
      "Your offer may be placed 'On Hold' if additional info is needed",
      "You receive a message in Supplier Portal → Messages with feedback",
      "Once approved, your products are visible in the OG Exports buyer catalogue",
      "Rejected offers include a reason — you can resubmit after correction",
    ],
    tip: "Keep an eye on the Messages section — admins communicate directly through the portal.",
  },
  {
    num: 6,
    title: "Supply Agreement & Contract",
    subtitle: "Sign the formal supplier agreement with OG Exports",
    icon: Handshake,
    color: "#10b981",
    duration: "1 – 3 business days",
    cost: () => "Free",
    details: [
      "OG Exports sends a Supply Agreement covering pricing, quality, and delivery terms",
      "Review the contract with your legal advisor if needed",
      "Sign and return the agreement (digital signature accepted)",
      "The agreement includes: commodity specs, FOB price, delivery schedule, and penalty clauses",
      "A new agreement is issued for each shipment order",
    ],
    docs: [
      "Signed Supply Agreement",
      "Company stamp (if applicable)",
    ],
  },
  {
    num: 7,
    title: "Packaging & Labeling Standards",
    subtitle: "Pack your commodity to international export standards",
    icon: Box,
    color: "#f97316",
    duration: "Varies by commodity",
    cost: (isPK) => isPK
      ? "Packaging cost is your responsibility\nTypical range: PKR 8,000 – 35,000 per MT"
      : "Packaging cost is your responsibility\nTypical range: $30 – $150 per MT",
    details: [
      "All packaging must comply with destination country's import regulations",
      "Use food-grade, moisture-resistant packaging material",
      "Each bag/box must show: product name, origin, net weight, lot number",
      "Rice & grains: 25kg or 50kg PP woven bags with inner liner",
      "Fresh produce: ventilated carton boxes with OG Exports-approved label",
      "OG Exports can provide packaging specifications on request",
    ],
    tip: "Improper packaging is the leading cause of customs delays and shipment rejection.",
  },
  {
    num: 8,
    title: "Pre-Shipment Inspection",
    subtitle: "Third-party inspection before goods are loaded",
    icon: Search,
    color: "#ec4899",
    duration: "1 – 2 days",
    cost: (isPK) => isPK
      ? "PKR 8,000 – 18,000 (paid by OG Exports or split)"
      : "$40 – $90 (paid by OG Exports or split)",
    details: [
      "An accredited third-party inspector visits your warehouse/factory",
      "Inspection covers: quantity, quality, packaging, and moisture levels",
      "Inspection certificate is issued within 24 hours",
      "Any discrepancies must be resolved before loading",
      "OG Exports coordinates the inspection — you provide warehouse access",
    ],
    docs: [
      "Pre-shipment Inspection Certificate (SGS / Bureau Veritas / Intertek)",
      "Weight certificate",
      "Fumigation certificate (if required)",
    ],
  },
  {
    num: 9,
    title: "Export Documentation",
    subtitle: "Prepare all government-issued export documents",
    icon: Plane,
    color: "#6366f1",
    duration: "2 – 5 business days",
    cost: (isPK) => isPK
      ? [
          "Phytosanitary Certificate: PKR 2,500 – 5,000",
          "Certificate of Origin: PKR 1,500 – 3,000",
          "Fumigation Certificate: PKR 3,000 – 8,000",
          "WEBOC / PSW Processing: Included in NTN",
        ].join("\n")
      : [
          "Phytosanitary Certificate: $15 – $35",
          "Certificate of Origin: $10 – $25",
          "Fumigation Certificate: $20 – $55",
          "Country-specific permits: varies",
        ].join("\n"),
    details: [
      "Phytosanitary Certificate: issued by Dept of Plant Protection (DPP)",
      "Certificate of Origin: issued by FPCCI / Chamber of Commerce",
      "Fumigation Certificate: issued by licensed fumigator",
      "WEBOC / PSW filing: electronic customs declaration for Pakistan exports",
      "Bill of Lading / Airway Bill: issued by the shipping/airline agent",
      "OG Exports assists with document coordination",
    ],
    docs: [
      "Phytosanitary Certificate",
      "Certificate of Origin (Form A / GSP)",
      "Fumigation Certificate",
      "Commercial Invoice",
      "Packing List",
      "Bill of Lading / Airway Bill",
      "WEBOC Export GD (Pakistan)",
    ],
    tip: "Start documentation 1 week before the planned loading date to avoid shipping delays.",
  },
  {
    num: 10,
    title: "Shipment & Logistics",
    subtitle: "Goods are loaded and dispatched to the buyer",
    icon: Plane,
    color: "#14b8a6",
    duration: "1 – 3 days (loading) + transit time",
    cost: (isPK) => isPK
      ? "Freight: PKR 25,000 – 120,000 per MT (FCL/LCL)\nHandling: PKR 5,000 – 15,000 per container"
      : "Freight: $80 – $450 per MT (FCL/LCL)\nHandling: $20 – $70 per container",
    details: [
      "OG Exports coordinates with the freight forwarder",
      "Goods are loaded at the designated port under Bill of Lading",
      "Container seal numbers and BL copies are shared with you",
      "Estimated transit time: 7 – 25 days depending on destination",
      "Real-time shipment tracking is available through the portal",
      "FOB terms: your responsibility ends at port of loading",
    ],
    tip: "Keep all original shipping documents — they are required for payment release.",
  },
  {
    num: 11,
    title: "Payment Settlement",
    subtitle: "Receive payment after successful delivery",
    icon: Banknote,
    color: "#f59e0b",
    duration: "7 – 21 days after delivery",
    cost: (isPK) => isPK
      ? "Platform Commission: 2% – 3% of shipment value (deducted)\nBank Transfer Fee: PKR 500 – 2,000"
      : "Platform Commission: 2% – 3% of shipment value (deducted)\nInternational Wire Fee: $15 – $40",
    details: [
      "Payment terms are defined in your Supply Agreement (LC / TT / CAD)",
      "Letter of Credit (LC): payment released upon document presentation to bank",
      "Telegraphic Transfer (TT): OG Exports releases payment after buyer confirms receipt",
      "OG Exports deducts the platform commission before transfer",
      "Payment is made in PKR (Pakistan suppliers) or USD (international suppliers)",
      "Payment confirmation and invoice are sent to your portal inbox",
    ],
    docs: [
      "Original Bill of Lading",
      "Commercial Invoice",
      "Certificate of Origin",
      "Phytosanitary Certificate",
      "Bank account details (verified during KYC)",
    ],
    tip: "Ensure your bank account details in the portal are always current to avoid payment delays.",
  },
  {
    num: 12,
    title: "Performance Rating & Repeat Orders",
    subtitle: "Build your supplier reputation for long-term partnerships",
    icon: Star,
    color: "#eab308",
    duration: "Ongoing",
    cost: () => "Free",
    details: [
      "OG Exports rates your performance after each shipment (1–5 stars)",
      "Rating criteria: quality accuracy, delivery timeliness, documentation, communication",
      "High-rated suppliers (4★+) are prioritised for repeat and bulk orders",
      "You can view your rating history in Supplier Portal → My Offers",
      "Top-rated suppliers may be featured in the OG Exports buyer catalogue",
      "Consistent performance unlocks preferential payment terms",
    ],
    tip: "A 5-star rating opens doors to long-term contracts and higher-volume orders.",
  },
]

// ─── Component ────────────────────────────────────────────────────────────────
export default function SupplierProcedure() {
  const c = useCurrency()
  const country = c.country
  const isPakistan = isPakistanCountry(country)
  const symbol = isPakistan ? "PKR" : "USD"
  const flag = isPakistan ? "🇵🇰" : "🌍"
  const label = isPakistan ? "Pakistani Rupee (PKR)" : "US Dollar (USD)"

  const totalSteps = STEPS.length

  return (
    <SupplierPortalLayout
      title="Supplier Procedure"
      subtitle="Complete A-Z guide to supplying through OG Exports"
    >
      <div className="max-w-4xl mx-auto space-y-6 pb-10">

        {/* ── Header banner ── */}
        <div
          className="rounded-2xl p-6 border"
          style={{
            background: isPakistan
              ? "linear-gradient(135deg, hsl(158 59% 8%), hsl(158 59% 12%))"
              : "linear-gradient(135deg, hsl(220 59% 8%), hsl(220 59% 12%))",
            borderColor: isPakistan ? "hsl(158 59% 20%)" : "hsl(220 59% 20%)",
          }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{flag}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">
                  Pricing shown in
                </span>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: isPakistan ? "hsl(158 59% 15%)" : "hsl(220 59% 15%)",
                    color: isPakistan ? "hsl(158 80% 70%)" : "hsl(220 80% 70%)",
                    border: `1px solid ${isPakistan ? "hsl(158 59% 25%)" : "hsl(220 59% 25%)"}`,
                  }}
                >
                  {label}
                </span>
              </div>
              <h2 className="text-xl font-heading font-bold text-white">
                Complete Supplier Onboarding — {totalSteps} Steps
              </h2>
              <p className="text-sm text-white/60 mt-1">
                {country
                  ? `Detected country: ${country} — all fees shown in ${symbol}`
                  : "Update your country in Company Profile to see localised pricing"}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="text-2xl font-heading font-bold text-white">{totalSteps}</div>
                <div className="text-[10px] text-white/50 uppercase tracking-wider">Steps</div>
              </div>
              <div className="text-center px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.07)" }}>
                <div className="text-2xl font-heading font-bold text-white">~30</div>
                <div className="text-[10px] text-white/50 uppercase tracking-wider">Days avg</div>
              </div>
            </div>
          </div>

          {/* Progress bar (visual, all steps) */}
          <div className="mt-5">
            <div className="flex gap-1">
              {STEPS.map(s => (
                <div
                  key={s.num}
                  className="flex-1 h-1.5 rounded-full"
                  style={{ background: s.color, opacity: 0.75 }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-white/40">Start</span>
              <span className="text-[10px] text-white/40">Complete</span>
            </div>
          </div>
        </div>

        {/* ── Currency info bar ── */}
        {!country && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/8">
            <Info className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-600">
              Country not set — fees shown in USD by default. Go to{" "}
              <Link href="/supplier/profile" className="font-semibold underline">Company Profile</Link>{" "}
              to update your country and see PKR pricing.
            </p>
          </div>
        )}

        {/* ── Steps ── */}
        <div className="space-y-4">
          {STEPS.map((step, idx) => {
            const Icon = step.icon
            const rawCost = step.cost(isPakistan)
            const costLines = rawCost.split("\n")
            return (
              <div
                key={step.num}
                className="rounded-2xl border bg-card overflow-hidden"
                style={{ borderColor: "hsl(var(--border))" }}
              >
                {/* Step header */}
                <div
                  className="flex items-start gap-4 p-5"
                  style={{ borderLeft: `4px solid ${step.color}` }}
                >
                  {/* Number + Icon */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: `${step.color}18` }}
                    >
                      <Icon className="w-5 h-5" style={{ color: step.color }} />
                    </div>
                    {idx < STEPS.length - 1 && (
                      <div className="w-px h-4 rounded-full" style={{ background: step.color + "40" }} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                              background: `${step.color}18`,
                              color: step.color,
                            }}
                          >
                            STEP {step.num}
                          </span>
                        </div>
                        <h3 className="text-base font-heading font-bold text-foreground">
                          {step.title}
                        </h3>
                        <p className="text-sm text-muted-foreground">{step.subtitle}</p>
                      </div>

                      {/* Meta badges */}
                      <div className="flex flex-wrap gap-2 sm:shrink-0">
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs"
                          style={{ borderColor: "hsl(var(--border))", background: "hsl(var(--muted) / 0.5)" }}>
                          <span className="text-muted-foreground">⏱</span>
                          <span className="font-medium text-foreground/80">{step.duration}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost box */}
                    <div
                      className="mt-3 px-3 py-2.5 rounded-xl border"
                      style={{
                        background: rawCost === "Free"
                          ? "hsl(158 59% 15% / 0.12)"
                          : `${step.color}0d`,
                        borderColor: rawCost === "Free"
                          ? "hsl(158 59% 25% / 0.35)"
                          : `${step.color}30`,
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <Banknote
                          className="w-3.5 h-3.5 mt-0.5 shrink-0"
                          style={{ color: rawCost === "Free" ? "#10b981" : step.color }}
                        />
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Cost ({symbol})
                          </span>
                          {costLines.map((line, i) => (
                            <p key={i} className="text-xs font-semibold leading-snug mt-0.5"
                              style={{ color: rawCost === "Free" ? "#10b981" : step.color }}>
                              {line}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Details list */}
                    <ul className="mt-4 space-y-1.5">
                      {step.details.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-foreground/75">
                          <CheckCircle2
                            className="w-3.5 h-3.5 shrink-0 mt-0.5"
                            style={{ color: step.color }}
                          />
                          {d}
                        </li>
                      ))}
                    </ul>

                    {/* Required documents */}
                    {step.docs && (
                      <div className="mt-4 p-3 rounded-xl border"
                        style={{
                          background: "hsl(var(--muted) / 0.4)",
                          borderColor: "hsl(var(--border))",
                        }}
                      >
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                          📄 Required Documents
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {step.docs.map((doc, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border"
                              style={{
                                background: `${step.color}10`,
                                borderColor: `${step.color}30`,
                                color: step.color,
                              }}
                            >
                              <FileText className="w-3 h-3" />
                              {doc}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tip */}
                    {step.tip && (
                      <div className="mt-3 flex items-start gap-2 p-3 rounded-xl border border-amber-500/25 bg-amber-500/6">
                        <Info className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                          <strong>Pro Tip:</strong> {step.tip}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Footer note ── */}
        <div className="rounded-2xl border p-5 bg-muted/30">
          <div className="flex items-start gap-3">
            <Globe className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground mb-1">Currency & Pricing Note</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isPakistan
                  ? "All fees above are shown in Pakistani Rupees (PKR) as your registered country is Pakistan. Rates are indicative and may vary by commodity, volume, and service provider. OG Exports does not mark up government or third-party fees."
                  : "All fees above are shown in US Dollars (USD) as your registered country is outside Pakistan. Rates are indicative and may vary by commodity, volume, and service provider. OG Exports does not mark up government or third-party fees."
                }
              </p>
              {country && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  Registered country: <strong className="text-foreground">{country}</strong>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </SupplierPortalLayout>
  )
}
