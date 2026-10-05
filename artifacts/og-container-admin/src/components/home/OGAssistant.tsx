import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Send, Bot, ChevronDown, Sparkles, Zap } from "lucide-react"
import {
  getProducts,
  type AdminProduct,
} from "@/lib/admin-data"
import { getSiteSettings, type SiteSettings } from "@/lib/cms-data"

const EMERALD  = "#0F3D2E"
const GREEN    = "#4CAF50"
const GOLD     = "#D4A012"
const OFFWHITE = "#F7F7F2"

// ── Live App Snapshot ─────────────────────────────────────────────────────────
interface AppData {
  products:  AdminProduct[]
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
    cms:       getSiteSettings(),
    news,
    today:     new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  }
}

// ── Response Builders ─────────────────────────────────────────────────────────

function buildWelcome(d: AppData): string {
  const cms        = d.cms
  return `Welcome to **OG Exports** — ${cms.company.description.slice(0, 120)}…

**I can help with:**
🌾 Product catalogue and recorded prices, when available
💼 Investment listings and account-specific financial figures in the investor portal
🚢 Shipment status recorded in the portal; no live carrier tracking is connected
📄 Contact details and general order guidance

Type a question to continue. Figures and shipment updates are shown only when recorded by the system.`
}

function buildProductList(d: AppData): string {
  if (!d.products.length)
    return `Product catalogue data is not available in this view.\n📧 Contact: ${d.cms.contact.email}`

  const lines = d.products.map(p => {
    const price = p.fob ?? "Price not published"
    const minimum = p.moq ?? p.minOrder ?? "Not specified"
    const lead = p.leadTime ? ` | Lead time: ${p.leadTime}` : ""
    return `• **${p.name}** — Recorded FOB price: ${price} | Minimum order: ${minimum}${lead}`
  }).join("\n")

  return `🌾 **OG Exports Product Catalogue:**

${lines}

_Price freshness is not shown here; request a current quote before ordering._
📧 ${d.cms.contact.emailSales} | 📱 ${d.cms.contact.whatsapp}`
}

function buildAllPrices(d: AppData): string {
  if (!d.products.length)
    return `Product price data is not available in this view.\n📧 ${d.cms.contact.email}`

  const lines = d.products.map(p => {
    const price = p.fob ?? "Price not published"
    const hs    = p.hsCode ? ` [HS: ${p.hsCode}]` : ""
    const minimum = p.moq ?? p.minOrder ?? "Not specified"
    return `${p.name}: **${price}**${hs} (Minimum order: ${minimum})`
  }).join("\n")

  return `💰 **Recorded FOB Prices:**

${lines}

_Price freshness is not shown here; request a current quote before ordering._
📧 ${d.cms.contact.emailSales} | 📱 ${d.cms.contact.whatsapp}
For CIF/CFR quotes, contact our freight desk.`
}

function buildSingleProduct(p: AdminProduct, d: AppData): string {
  const price = p.fob ?? "Price not published"
  const specs = (p.specs || []).map(s => `  · ${s.label}: ${s.value}`).join("\n")
  const certs = (p.certifications || []).join(", ")
  const markets = (p.exportMarkets || []).join(", ")

  let txt = `📦 **${p.name}**\n\n`
  txt += `• **Recorded FOB price:** ${price}\n`
  txt += `• **Minimum order:** ${p.moq ?? p.minOrder ?? "Not specified"}\n`
  if (p.leadTime) txt += `• **Recorded lead time:** ${p.leadTime}\n`
  if (p.origin) txt += `• **Origin:** ${p.origin}\n`
  if (p.stock) txt += `• **Stock:** ${p.stock}\n`
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
  return `💼 **Investment Information:**

Open the investor portal at /invest to see the current listing and, after sign-in, your recorded investments, balance, and profit. This assistant does not publish minimum amounts or expected returns.

📱 WhatsApp: **${d.cms.contact.whatsapp}**\n📧 ${d.cms.contact.email}`
}

function buildShipping(d: AppData): string {
  return `🚢 **Shipment Information:**\n\nThis assistant does not have a live carrier connection and cannot show a vessel's current location or live ETA. Sign in to see shipment milestones recorded in your account, or contact the export team for an update.\n\n📧 ${d.cms.contact.email} | 📱 **${d.cms.contact.whatsapp}**`
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

**Social:**
• LinkedIn: ${s.linkedin}
• Instagram: ${s.instagram}

Contact the team for current availability and response times.`
}

function buildPayment(d: AppData): string {
  return `💳 **Payment Methods:**

Payment terms depend on the product and signed agreement. This assistant does not confirm payment instructions or accepted currencies. Verify the current terms with the sales team before sending funds.

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

  return `🏢 **OG Exports (Pvt) Ltd:**

${c.company.description}

**Key Stats:**
• Export markets: **${c.stats.countries}** countries
• Commodities: **${c.stats.commodities}** product lines
• Shipments completed: **${c.stats.shipments}**+
• Trade partners: **${c.stats.partners}**+
• Experience: **${c.stats.years}** years
• Investor-specific balances and investment terms are available in the signed-in investor portal.

**Mission:**
${c.company.mission}

**Vision:**
${c.company.vision}

📍 ${c.contact.city}
📧 ${c.contact.email} | 📱 ${c.contact.whatsapp}`
}

function buildStats(d: AppData): string {
  const c = d.cms

  return `📊 **OG Exports — Published Company Figures:**

**Company Scale:**
• 🌍 Export Markets: **${c.stats.countries}** countries
• 📦 Product Lines: **${c.stats.commodities}** commodities
• 👥 Verified Buyers: **${c.stats.buyers}**+
• 🚢 Shipments Completed: **${c.stats.shipments}**+
• 🤝 Trade Partners: **${c.stats.partners}**+
• 🏅 Certifications: **${c.stats.certifications}** active
• 📅 Experience: **${c.stats.years}** years`
}

function buildMarkets(d: AppData): string {
  return `🌍 **Export Markets:**

Destination availability and delivery terms depend on the product and current order. Ask the sales team to confirm the destination, required documents, and a current quote.

📱 ${d.cms.contact.whatsapp} · 📧 ${d.cms.contact.emailSales}`
}

function buildCertifications(d: AppData): string {
  return `📜 **Certificates and Compliance:**

This assistant does not verify certificate status or store current certificate copies. Request the relevant, current documents for your product and destination from the export team.

📧 ${d.cms.contact.emailSales} · 📱 ${d.cms.contact.whatsapp}`
}

function buildDocs(d: AppData): string {
  return `📄 **Trade Documents:**

Required and available documents depend on the product, destination, and order. Ask the export team for the verified document list for your shipment.

📧 ${d.cms.contact.emailSales}`
}

function buildOrderProcess(d: AppData): string {
  return `🚀 **How to Place an Order:**

1️⃣ **Inquiry** — Tell us: product · quantity · destination · incoterm
2️⃣ **Quotation** — Confirm the current price and terms with the sales team
3️⃣ **Sample** — Ask the sales team whether a sample is available
4️⃣ **Contract** — Sign Sales Purchase Agreement (SPA)
5️⃣ **Payment** — Open LC or send TT advance payment
6️⃣ **Production** — Grading · processing · lab testing · packing
7️⃣ **Shipment** — Vessel booking · BL · full docs
8️⃣ **Shipment updates** — Review milestones recorded in your account

Live carrier tracking is not connected to this assistant.

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
  "Recorded FOB prices",
  "Investment projects",
  "Shipment tracking availability",
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
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: GREEN }} />
                    Available records · No live carrier feed
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
