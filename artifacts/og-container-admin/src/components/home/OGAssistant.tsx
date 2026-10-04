import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Bot, ChevronDown, Sparkles, Zap } from "lucide-react"
import {
  getProducts, getInvestProjects, getSettings, getShipments, getOrders,
  type AdminProduct, type AdminInvestProject, type AdminSettings, type AdminShipment, type AdminOrder,
} from "@/lib/admin-data"
import { getSiteSettings, type SiteSettings } from "@/lib/cms-data"

const EMERALD  = "#0F3D2E"
const GREEN    = "#4CAF50"
const GOLD     = "#D4A012"
const OFFWHITE = "#F7F7F2"

// ── Live App Snapshot ─────────────────────────────────────────────────────────
interface AppData {
  products:  AdminProduct[]
  projects:  AdminInvestProject[]
  settings:  AdminSettings
  shipments: AdminShipment[]
  orders:    AdminOrder[]
  cms:       SiteSettings
  news:      { title: string; category: string; summary: string; priority: string }[]
  today:     string
}

function getAppData(): AppData {
  let news: AppData["news"] = []
  try {
    const raw = localStorage.getItem("og-trade-news")
    if (raw) {
      news = (JSON.parse(raw) as any[])
        .filter(n => n.status === "approved")
        .slice(0, 8)
        .map(n => ({ title: n.title, category: n.category, summary: n.summary || "", priority: n.priority || "medium" }))
    }
  } catch { /* ignore */ }

  return {
    products:  getProducts().filter(p => p.status === "approved"),
    projects:  getInvestProjects(),
    settings:  getSettings(),
    shipments: getShipments(),
    orders:    getOrders(),
    cms:       getSiteSettings(),
    news,
    today:     new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  }
}

// ── Response Builders ─────────────────────────────────────────────────────────

function buildWelcome(d: AppData): string {
  const prodCount  = d.products.length
  const projCount  = d.projects.filter(p => p.status === "active" || p.status === "funding").length
  const newsCount  = d.news.length
  const cms        = d.cms
  return `Welcome to **OG Exports** — ${cms.company.description.slice(0, 120)}…

**What I can help you with right now:**
🌾 **${prodCount} Live Products** — prices, specs, lead times
💼 **${projCount} Investment Projects** — ROI, targets, minimums
🚢 **Shipping & Logistics** — ports, carriers, active shipments
📜 **Certifications** — HACCP, ISO, FDA, SECP, TDAP
📰 **${newsCount} Trade News items** — latest verified alerts
💳 **Payment Terms** — LC, TT, crypto options
🌍 **${cms.stats.countries} Export Markets** worldwide
📞 **Contact & Support** — direct lines

Just type your question — I read live system data in real time.`
}

function buildProductList(d: AppData): string {
  if (!d.products.length)
    return `No products available right now.\n📧 Contact: ${d.cms.contact.email}`

  const lines = d.products.map(p => {
    const price = p.fobDisplay || p.fob || p.fobRate || "On request"
    const lead  = p.leadTime ? ` | Lead: ${p.leadTime}` : ""
    return `• **${p.name}** — ${price} | Min: ${p.moq || p.minOrder}${lead}`
  }).join("\n")

  return `🌾 **OG Exports Product Catalogue (${d.today}):**

${lines}

_All prices FOB Karachi — updated daily_
📧 ${d.cms.contact.emailSales} | 📱 ${d.cms.contact.whatsapp}`
}

function buildAllPrices(d: AppData): string {
  if (!d.products.length)
    return `Prices not available right now.\n📧 ${d.cms.contact.email}`

  const lines = d.products.map(p => {
    const price = p.fobDisplay || p.fob || p.fobRate || "On request"
    const hs    = p.hsCode ? ` [HS: ${p.hsCode}]` : ""
    return `${p.name}: **${price}**${hs} (Min: ${p.moq || p.minOrder})`
  }).join("\n")

  return `💰 **Live FOB Prices (${d.today}):**

${lines}

_FOB Karachi Port — Daily Update_
📧 ${d.cms.contact.emailSales} | 📱 ${d.cms.contact.whatsapp}
For CIF/CFR quotes, contact our freight desk.`
}

function buildSingleProduct(p: AdminProduct, d: AppData): string {
  const price = p.fobDisplay || p.fob || p.fobRate || "On request"
  const specs = (p.specs || []).map(s => `  · ${s.label}: ${s.value}`).join("\n")
  const certs = (p.certifications || []).join(", ")
  const markets = (p.exportMarkets || []).join(", ")

  let txt = `📦 **${p.name}**\n\n`
  txt += `• **Price:** ${price} (FOB Karachi)\n`
  txt += `• **Min. Order:** ${p.moq || p.minOrder}\n`
  txt += `• **Lead Time:** ${p.leadTime || "14–21 days"}\n`
  txt += `• **Origin:** ${p.origin || "Pakistan"}\n`
  txt += `• **Stock:** ${p.stock || "Available"}\n`
  if (p.hsCode)           txt += `• **HS Code:** ${p.hsCode}\n`
  if (p.shelfLife)        txt += `• **Shelf Life:** ${p.shelfLife}\n`
  if (p.storageInstructions) txt += `• **Storage:** ${p.storageInstructions}\n`
  if (p.description)      txt += `\n${p.description}\n`
  if (specs)              txt += `\n**Specs:**\n${specs}\n`
  if (certs)              txt += `\n**Certifications:** ${certs}\n`
  if (markets)            txt += `**Export Markets:** ${markets}\n`
  if ((p.paymentTerms || []).length)
                          txt += `**Payment Terms:** ${p.paymentTerms!.join(", ")}\n`
  if ((p.packagingOptions || []).length)
                          txt += `**Packaging:** ${p.packagingOptions!.join(", ")}\n`
  txt += `\nFor a formal quote:\n📧 ${d.cms.contact.emailSales} | 📱 **${d.cms.contact.whatsapp}**`
  return txt
}

function buildInvestment(d: AppData): string {
  const s           = d.settings
  const cms         = d.cms
  const active      = d.projects.filter(p => p.status === "active" || p.status === "funding")
  const minInv      = s.minInvestment ? `$${s.minInvestment.toLocaleString()}` : "$5,000"
  const investOpen  = s.investmentOpen !== false
  const methods     = (s.paymentMethods || []).filter(m => m.enabled).map(m => m.name).join(", ") || "LC, TT, USDT"

  let txt = `💼 **OG Exports Investment Platform (${d.today}):**\n\n`
  txt += `• **Status:** ${investOpen ? "✅ Open for new investors" : "⏸️ Currently closed"}\n`
  txt += `• **Minimum:** ${minInv}\n`
  txt += `• **Accepted:** ${methods}\n`
  txt += `• **Regulation:** SECP Registered · KYC Required\n`
  txt += `• **Track record:** ${cms.stats.years} years | ${cms.stats.shipments} shipments\n\n`

  if (active.length) {
    txt += `**Active Projects:**\n`
    active.forEach(p => {
      const pct = p.target ? Math.round((p.raised / p.target) * 100) : 0
      const bar = "█".repeat(Math.round(pct / 10)) + "░".repeat(10 - Math.round(pct / 10))
      txt += `\n🔹 **${p.title}**\n`
      txt += `   ROI: **${p.roi}** | Raised: $${p.raised.toLocaleString()} / $${p.target.toLocaleString()} (${pct}%)\n`
      txt += `   ${bar} ${pct}%\n`
      if (p.commodity) txt += `   Commodity: ${p.commodity}\n`
    })
  }

  txt += `\n📋 Register: /invest\n📱 WhatsApp: **${d.cms.contact.whatsapp}**\n📧 ${d.cms.contact.email}`
  return txt
}

function buildShipping(d: AppData): string {
  const active = d.shipments.filter(s => s.status === "in-transit" || s.status === "booking")
  const cms    = d.cms

  let txt = `🚢 **Shipping & Logistics (${d.today}):**\n\n`
  txt += `**Load Ports:** Karachi Port (KHI) · Port Qasim (KPTE)\n`
  txt += `**Main Carriers:** MSC · CMA CGM · Hapag-Lloyd · Evergreen · ONE\n`
  txt += `**Incoterms:** FOB · CIF · CFR · EXW available\n\n`

  if (active.length) {
    txt += `**Active Shipments (${active.length}):**\n`
    active.forEach(s => {
      txt += `📦 **${s.product}** → ${s.destination}\n`
      txt += `   Vessel: ${s.vessel} | Line: ${s.line}\n`
      txt += `   ETD: ${s.etd} | ETA: ${s.eta} | Status: ${s.status}\n\n`
    })
  } else {
    txt += `No shipments currently in transit.\n\n`
  }

  txt += `**Lead Times:**\n`
  txt += `• Middle East (UAE/KSA): 7–12 days\n`
  txt += `• Europe: 18–24 days\n`
  txt += `• Asia-Pacific: 10–16 days\n`
  txt += `• Africa: 14–22 days\n\n`
  txt += `For freight quotes:\n📧 ${cms.contact.email} | 📱 **${cms.contact.whatsapp}**`
  return txt
}

function buildContact(d: AppData): string {
  const c = d.cms.contact
  const s = d.cms.social
  return `📞 **OG Exports — Contact Us:**

📱 **WhatsApp / Call:** ${c.whatsapp}
🔗 WhatsApp link: ${s.whatsapp}
📧 **General:** ${c.email}
📧 **Sales:** ${c.emailSales}
📍 **Location:** ${c.address}, ${c.city}

🕐 **Business Hours:** Mon–Sat · 9AM–6PM (PKT)

**Social:**
• LinkedIn: ${s.linkedin}
• Instagram: ${s.instagram}

Expect a reply within 2 hours on WhatsApp.`
}

function buildPayment(d: AppData): string {
  const methods = d.settings.paymentMethods?.filter(m => m.enabled) || []
  const methodList = methods.length
    ? methods.map(m => `• **${m.name}** — ${m.desc}`).join("\n")
    : `• **LC at Sight** — Safest for first-time buyers\n• **TT Transfer** — 30% advance + 70% before BL release\n• **USDT/USDC** — For investment transactions`

  return `💳 **Payment Methods:**

${methodList}

**Currencies accepted:** USD · EUR · GBP · AED · SAR
**First-time buyers:** LC at Sight recommended
**Repeat buyers:** TT or open account available

For payment setup:\n📧 ${d.cms.contact.emailSales} | 📱 ${d.cms.contact.whatsapp}`
}

function buildNews(d: AppData): string {
  if (!d.news.length)
    return `📰 No trade news right now.\nVisit for live updates: /news`

  const hi  = d.news.filter(n => n.priority === "high").slice(0, 3)
  const med = d.news.filter(n => n.priority !== "high").slice(0, 4)

  let txt = `📰 **Latest Trade Intelligence (${d.today}):**\n`

  if (hi.length) {
    txt += `\n🔴 **High Priority:**\n`
    hi.forEach((n, i) => {
      txt += `${i + 1}. [${n.category.toUpperCase()}] ${n.title}\n`
      if (n.summary) txt += `   _${n.summary.slice(0, 100)}…_\n`
    })
  }

  if (med.length) {
    txt += `\n📊 **Market Updates:**\n`
    med.forEach((n, i) => {
      txt += `${i + 1}. [${n.category.toUpperCase()}] ${n.title}\n`
    })
  }

  txt += `\nFull coverage: /news`
  return txt
}

function buildCompany(d: AppData): string {
  const c   = d.cms
  const s   = d.settings
  const prods = d.products
  const projs = d.projects

  return `🏢 **OG Exports (Pvt) Ltd:**

${c.company.description}

**Key Stats:**
• Export markets: **${c.stats.countries}** countries
• Commodities: **${c.stats.commodities}** product lines
• Active products: **${prods.length}** (verified)
• Investment projects: **${projs.length}**
• Shipments completed: **${c.stats.shipments}**+
• Trade partners: **${c.stats.partners}**+
• Experience: **${c.stats.years}** years
• Min. investment: **$${(s.minInvestment || 5000).toLocaleString()}**

**Mission:**
${c.company.mission}

**Vision:**
${c.company.vision}

**SECP Registered** · HACCP · ISO 9001 · FDA · TDAP
📍 ${c.contact.city}
📧 ${c.contact.email} | 📱 ${c.contact.whatsapp}`
}

function buildStats(d: AppData): string {
  const c = d.cms
  const activeProjs = d.projects.filter(p => p.status === "active" || p.status === "funding")
  const activeShips = d.shipments.filter(s => s.status === "in-transit").length
  const pendingOrds = d.orders.filter(o => o.status === "pending" || o.status === "confirmed").length

  return `📊 **OG Exports — Live Figures (${d.today}):**

**Company Scale:**
• 🌍 Export Markets: **${c.stats.countries}** countries
• 📦 Product Lines: **${c.stats.commodities}** commodities
• 👥 Verified Buyers: **${c.stats.buyers}**+
• 🚢 Shipments Completed: **${c.stats.shipments}**+
• 🤝 Trade Partners: **${c.stats.partners}**+
• 🏅 Certifications: **${c.stats.certifications}** active
• 📅 Operating Since: **${new Date().getFullYear() - parseInt(c.stats.years.replace("+", ""))}** (${c.stats.years} years)

**Today's Snapshot:**
• Active products: **${d.products.length}**
• Investment projects: **${activeProjs.length}** open
• Shipments in transit: **${activeShips}**
• Orders in progress: **${pendingOrds}**`
}

function buildMarkets(d: AppData): string {
  const c = d.cms
  return `🌍 **OG Exports Global Markets (${c.stats.countries}):**

🇦🇪 **Middle East (Primary):** UAE, Saudi Arabia, Qatar, Kuwait, Oman, Bahrain
🇪🇺 **Europe:** Netherlands, Germany, UK, France, Belgium, Spain
🌏 **Asia-Pacific:** China, Vietnam, Indonesia, Japan, Singapore, Malaysia
🌍 **Africa:** Nigeria, Kenya, Egypt, Tanzania, Ethiopia, Ghana
🇺🇸 **North America:** USA (FDA Registered), Canada
🌏 **South Asia:** Sri Lanka, Bangladesh, Nepal

**Top Export Corridors:**
• Karachi → Dubai (7–10 days)
• Karachi → Rotterdam (20–24 days)
• Karachi → Shanghai (14–18 days)
• Karachi → Mombasa (16–20 days)

📱 For market-specific pricing: ${d.cms.contact.whatsapp}`
}

function buildCertifications(d: AppData): string {
  return `📜 **OG Exports Certifications:**

✅ **HACCP** — Hazard Analysis & Critical Control Point
✅ **ISO 9001:2015** — Quality Management System
✅ **ISO 22000** — Food Safety Management
✅ **FDA Registered** — U.S. Food & Drug Administration
✅ **SECP Registered** — Corporate compliance (Pakistan)
✅ **TDAP Certified** — Trade Development Authority of Pakistan
✅ **Halal Certificate** — Available on request
✅ **Phytosanitary** — Per destination requirements

**Quality Tests per Shipment:**
• Moisture content · Aflatoxin · Pesticide residues (EU MRL)
• Heavy metals · Microbiological · Foreign matter
• Third-party inspection: SGS / Bureau Veritas

Every shipment includes full **Certificate of Analysis (CoA)**
📧 Request certificates: ${d.cms.contact.email}`
}

function buildDocs(d: AppData): string {
  return `📄 **Export Documents Provided:**

✅ Bill of Lading (BL / HBL)
✅ Phytosanitary Certificate
✅ Certificate of Origin (CoO)
✅ Certificate of Analysis (CoA)
✅ Commercial Invoice
✅ Packing List
✅ Weight Certificate
✅ Fumigation Certificate
✅ Insurance Certificate
✅ Halal Certificate (on request)
✅ FORM-E (Pakistan customs)

**Timeline:** All documents ready 7–10 business days after order confirmation.
**Legalization:** Available for GCC/Saudi destinations (Chamber + Embassy).

📧 ${d.cms.contact.email}`
}

function buildOrderProcess(d: AppData): string {
  return `🚀 **How to Place an Order:**

1️⃣ **Inquiry** — Tell us: product · quantity · destination · incoterm
2️⃣ **Quotation** — Receive FOB/CIF quote within **48 hours**
3️⃣ **Sample** — Free samples dispatched on request (courier charges apply)
4️⃣ **Contract** — Sign Sales Purchase Agreement (SPA)
5️⃣ **Payment** — Open LC or send TT advance payment
6️⃣ **Production** — Grading · processing · lab testing · packing
7️⃣ **Shipment** — Vessel booking · BL · full docs
8️⃣ **Tracking** — Real-time updates until delivery

**Average timeline:** 21–35 days from order to vessel departure

📧 Start here: ${d.cms.contact.emailSales}
📱 WhatsApp: **${d.cms.contact.whatsapp}**`
}

// ── Knowledge Base ────────────────────────────────────────────────────────────
const STATIC_KB: { keys: string[]; build: (d: AppData) => string }[] = [
  {
    keys: ["hello", "hi", "hey", "good morning", "good afternoon", "good evening", "greet", "welcome", "start", "begin"],
    build: buildWelcome,
  },
  {
    keys: ["help", "what can", "guide", "support", "menu", "options", "capabilities", "can you", "what do you"],
    build: (d) => buildWelcome(d),
  },
  {
    keys: ["certif", "haccp", "iso", "fda", "secp", "tdap", "standard", "approved", "accredit", "license"],
    build: buildCertifications,
  },
  {
    keys: ["quality", "test", "lab", "inspection", "grading", "guarantee", "assurance", "qc", "control"],
    build: buildCertifications,
  },
  {
    keys: ["document", "docs", "bl", "phyto", "certificate of origin", "coa", "paperwork", "bill of lading", "invoice", "packing"],
    build: buildDocs,
  },
  {
    keys: ["how to order", "order process", "getting started", "start buying", "place order", "ordering", "procedure", "steps"],
    build: buildOrderProcess,
  },
  {
    keys: ["market", "countries", "export to", "global", "destination", "which countries", "where do you export", "reach"],
    build: buildMarkets,
  },
  {
    keys: ["stat", "number", "figure", "how many", "scale", "size", "how big", "company size", "overview", "summary"],
    build: buildStats,
  },
  {
    keys: ["thank", "thanks", "great", "excellent", "perfect", "good job", "appreciate"],
    build: (d) => `You're welcome! 🌿 Happy to help.\n\n📱 WhatsApp: **${d.cms.contact.whatsapp}**\n📧 ${d.cms.contact.email}\n\n_OG Exports — ${d.cms.footer.tagline}_`,
  },
]

// ── Intent Detection ──────────────────────────────────────────────────────────
type Intent =
  | "price_all" | "price_single" | "products_all" | "investment"
  | "shipping"  | "contact"      | "payment"       | "news"
  | "company"   | "stats"        | "markets"       | "certs"
  | "docs"      | "order_proc"   | "static"        | "none"

interface MatchedIntent { intent: Intent; product?: AdminProduct; staticIdx?: number }

function detectIntent(input: string, data: AppData): MatchedIntent {
  const l = input.toLowerCase()
  const has = (terms: string[]) => terms.some(t => l.includes(t))

  const PRICE   = ["price", "rate", "cost", "how much", "charges", "quote", "fob", "cif", "per kg", "per mt", "per ton"]
  const INVEST  = ["invest", "investment", "return", "roi", "profit", "dividend", "fund", "project", "capital", "portfolio", "raise"]
  const SHIP    = ["ship", "shipping", "freight", "container", "cargo", "logistics", "route", "transit", "vessel", "port", "etd", "eta", "lead time", "delivery"]
  const CONTACT = ["contact", "phone", "whatsapp", "email", "address", "location", "reach", "office", "number", "call"]
  const PAY     = ["payment", "lc", "letter of credit", "tt", "transfer", "bank", "crypto", "usdt", "usdc", "wire", "swift"]
  const NEWS    = ["news", "trade news", "update", "market update", "latest", "alert", "intelligence", "report", "price alert"]
  const COMPANY = ["company", "about", "who are", "og exports", "history", "establish", "founded", "background", "overview"]
  const STATS   = ["stat", "number", "figure", "how many", "scale", "how big", "buyers", "shipments", "partners", "countries served"]
  const MARKETS = ["market", "which countries", "export to", "where", "global reach", "destination countries", "territory"]
  const CERTS   = ["certif", "haccp", "iso", "fda", "secp", "tdap", "standard", "accredit", "quality assurance", "qc", "test", "lab"]
  const DOCS    = ["document", "bl", "phyto", "bill of lading", "certificate of origin", "invoice", "packing list", "paperwork"]
  const ORDER   = ["how to order", "order process", "place an order", "getting started", "buy from", "start buying", "ordering", "step"]
  const PROD_ALL = ["all product", "products", "commodity", "what do you sell", "items", "list", "catalogue", "catalog", "what products", "range"]

  const isPriceQ  = has(PRICE)
  const isProdsQ  = has(PROD_ALL)

  // Specific product match
  if (isPriceQ || isProdsQ) {
    for (const p of data.products) {
      const nameLower = p.name.toLowerCase()
      const words = nameLower.split(/[\s\(\)\/\-]+/)
      if (words.some(w => w.length > 3 && l.includes(w))) {
        return isPriceQ
          ? { intent: "price_single", product: p }
          : { intent: "products_all" }
      }
    }
  }

  if (isPriceQ)   return { intent: "price_all" }
  if (isProdsQ)   return { intent: "products_all" }
  if (has(INVEST)) return { intent: "investment" }
  if (has(SHIP))   return { intent: "shipping" }
  if (has(CONTACT))return { intent: "contact" }
  if (has(PAY))    return { intent: "payment" }
  if (has(NEWS))   return { intent: "news" }
  if (has(STATS))  return { intent: "stats" }
  if (has(MARKETS))return { intent: "markets" }
  if (has(CERTS))  return { intent: "certs" }
  if (has(DOCS))   return { intent: "docs" }
  if (has(ORDER))  return { intent: "order_proc" }
  if (has(COMPANY))return { intent: "company" }

  // Static KB
  for (let i = 0; i < STATIC_KB.length; i++) {
    if (STATIC_KB[i].keys.some(k => l.includes(k)))
      return { intent: "static", staticIdx: i }
  }

  return { intent: "none" }
}

// ── Main Response ─────────────────────────────────────────────────────────────
function getResponse(input: string): string {
  const data  = getAppData()
  const { intent, product, staticIdx } = detectIntent(input, data)

  switch (intent) {
    case "price_all":    return buildAllPrices(data)
    case "price_single": return product ? buildSingleProduct(product, data) : buildAllPrices(data)
    case "products_all": return buildProductList(data)
    case "investment":   return buildInvestment(data)
    case "shipping":     return buildShipping(data)
    case "contact":      return buildContact(data)
    case "payment":      return buildPayment(data)
    case "news":         return buildNews(data)
    case "company":      return buildCompany(data)
    case "stats":        return buildStats(data)
    case "markets":      return buildMarkets(data)
    case "certs":        return buildCertifications(data)
    case "docs":         return buildDocs(data)
    case "order_proc":   return buildOrderProcess(data)
    case "static":       return STATIC_KB[staticIdx!].build(data)
    default:
      return `I couldn't find a specific answer for that. 😊

Here's what I can help with:
🌾 **Products & Prices** — "Show me all products" or "Rice price"
💼 **Investment** — "Investment projects" or "ROI"
🚢 **Shipping** — "Shipping routes" or "Lead times"
📜 **Certifications** — "HACCP" or "ISO certifications"
📰 **Trade News** — "Latest trade news"
🌍 **Markets** — "Which countries do you export to?"
📞 **Contact** — "How to contact OG Exports?"

Or reach us directly:
📱 **${data.cms.contact.whatsapp}**
📧 ${data.cms.contact.email}`
  }
}

// ── Chat UI ────────────────────────────────────────────────────────────────────
interface Msg { role: "user" | "bot"; text: string; time: string }

function formatTime() {
  return new Date().toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })
}

function BotMessage({ text }: { text: string }) {
  return (
    <span>
      {text.split(/(\*\*[^*]+\*\*)|\n/g).map((part, i) => {
        if (!part) return <br key={i} />
        if (part.startsWith("**") && part.endsWith("**"))
          return <strong key={i}>{part.slice(2, -2)}</strong>
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

const QUICK_ACTIONS = [
  "Show all products",
  "Live FOB prices",
  "Investment projects",
  "Active shipments",
  "Latest trade news",
  "Certifications",
  "Export markets",
  "How to order",
]

export function OGAssistant() {
  const [open, setOpen]         = useState(false)
  const [input, setInput]       = useState("")
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [typing, setTyping]     = useState(false)
  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLInputElement>(null)

  // Load welcome message once
  useEffect(() => {
    if (messages.length === 0) {
      const data = getAppData()
      setMessages([{
        role: "bot",
        text: buildWelcome(data),
        time: formatTime(),
      }])
    }
  }, [])

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80)
      setTimeout(() => inputRef.current?.focus(), 150)
    }
  }, [messages, open, minimized])

  function send(text?: string) {
    const msg = (text || input).trim()
    if (!msg) return
    setInput("")
    setMessages(prev => [...prev, { role: "user", text: msg, time: formatTime() }])
    setTyping(true)
    setTimeout(() => {
      const resp = getResponse(msg)
      setMessages(prev => [...prev, { role: "bot", text: resp, time: formatTime() }])
      setTyping(false)
    }, 600 + Math.random() * 300)
  }

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={() => { setOpen(true); setMinimized(false) }}
            className="fixed z-40 flex items-center justify-center rounded-full shadow-2xl"
            style={{
              bottom: "88px", right: "24px", width: "56px", height: "56px",
              background: `linear-gradient(135deg, ${EMERALD} 0%, #1a5c40 100%)`,
              border: `2px solid ${GOLD}60`,
              boxShadow: `0 8px 32px ${EMERALD}50`,
            }}
            aria-label="Open OG Trade Assistant"
          >
            <Bot className="w-6 h-6" style={{ color: GOLD }} />
            <span className="absolute inline-flex w-full h-full rounded-full animate-ping"
              style={{ background: `${GREEN}30`, opacity: 0.6 }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl"
            style={{
              bottom: "88px", right: "24px", width: "390px",
              height: minimized ? "60px" : "600px", maxHeight: "82vh",
              border: `1px solid ${GOLD}30`,
              boxShadow: `0 24px 64px rgba(0,0,0,0.3), 0 0 0 1px ${EMERALD}20`,
              transition: "height 0.3s cubic-bezier(.4,0,.2,1)",
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 flex-shrink-0"
              style={{
                background: `linear-gradient(90deg, ${EMERALD} 0%, #1a5c40 100%)`,
                borderBottom: `1px solid ${GOLD}25`,
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: `${GOLD}20`, border: `1px solid ${GOLD}40` }}
                >
                  <Bot className="w-4 h-4" style={{ color: GOLD }} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">OG Trade Assistant</span>
                    <Sparkles className="w-3 h-3" style={{ color: GOLD }} />
                  </div>
                  <div className="flex items-center gap-1 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                    <span className="w-1.5 h-1.5 rounded-full inline-block animate-pulse" style={{ background: GREEN }} />
                    Live Data · All systems online
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMinimized(m => !m)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${minimized ? "rotate-180" : ""}`} />
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="w-7 h-7 rounded-full flex items-center justify-center transition-all hover:bg-white/10"
                  style={{ color: "rgba(255,255,255,0.7)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: OFFWHITE }}>
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                      {m.role === "bot" && (
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center mr-2 flex-shrink-0 mt-0.5"
                          style={{ background: EMERALD }}
                        >
                          <Bot className="w-3.5 h-3.5" style={{ color: GOLD }} />
                        </div>
                      )}
                      <div className="max-w-[84%]">
                        <div
                          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user" ? "rounded-tr-sm" : "rounded-tl-sm"}`}
                          style={m.role === "user"
                            ? { background: EMERALD, color: "white" }
                            : { background: "white", color: "#1F2933", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}
                        >
                          {m.role === "bot" ? <BotMessage text={m.text} /> : m.text}
                        </div>
                        <div className="text-xs mt-1 px-1" style={{ color: "#9CA3AF" }}>{m.time}</div>
                      </div>
                    </div>
                  ))}

                  {typing && (
                    <div className="flex items-end gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: EMERALD }}>
                        <Bot className="w-3.5 h-3.5" style={{ color: GOLD }} />
                      </div>
                      <div className="px-4 py-3 rounded-2xl rounded-tl-sm"
                        style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)" }}>
                        <div className="flex gap-1 items-center h-4">
                          {[0, 1, 2].map(d => (
                            <span key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                              style={{ background: "#9CA3AF", animationDelay: `${d * 0.15}s` }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                {/* Quick Actions */}
                {messages.length <= 1 && (
                  <div
                    className="px-3 py-2 flex flex-wrap gap-1.5"
                    style={{ background: OFFWHITE, borderTop: "1px solid rgba(0,0,0,0.06)" }}
                  >
                    {QUICK_ACTIONS.map(q => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-all hover:opacity-80"
                        style={{ background: `${EMERALD}10`, color: EMERALD, border: `1px solid ${EMERALD}25` }}
                      >
                        <Zap className="w-2.5 h-2.5" />
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input */}
                <div
                  className="flex gap-2 px-3 py-3 flex-shrink-0"
                  style={{ background: "white", borderTop: "1px solid rgba(0,0,0,0.08)" }}
                >
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                    placeholder="Ask about products, prices, investment…"
                    className="flex-1 text-sm rounded-xl px-3.5 py-2.5 outline-none"
                    style={{
                      background: OFFWHITE,
                      border: `1.5px solid ${EMERALD}20`,
                      color: "#1F2933",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = `${EMERALD}60`)}
                    onBlur={e => (e.currentTarget.style.borderColor = `${EMERALD}20`)}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim()}
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                    style={{
                      background: input.trim() ? EMERALD : "#E5E7EB",
                      color: input.trim() ? "white" : "#9CA3AF",
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
