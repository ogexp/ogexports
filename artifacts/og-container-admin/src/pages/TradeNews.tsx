import { useState, useEffect, useRef } from "react"
import { Globe, Newspaper, Ship, DollarSign, Cloud, TrendingUp, AlertTriangle, Cpu, Search, ExternalLink, Clock, MapPin, Star, Bookmark, BookmarkCheck, Copy, Share2, Link2, Mail, X, ChevronRight, Flame, AlertCircle } from "lucide-react"
import { fetchLivePrices, getCachedPrices, getCacheAge, FALLBACK_PRICES, type LivePrice } from "@/lib/live-commodity-prices"
import { fetchPublicTradeNews, type ApiTradeNews } from "@/lib/auto-news-fetch"

const BOOKMARKS_KEY = "og-trade-bookmarks"

const EMERALD = "#0F3D2E"
const GOLD = "#D4A012"
const GREEN = "#4CAF50"

type NewsCat = "commodity" | "shipping" | "currency" | "weather" | "regulation" | "market" | "risk" | "ai"
type SortMode = "latest" | "trending" | "bookmarks"

type TradeNews = ApiTradeNews

const CAT_CONFIG: Record<NewsCat, { label: string; color: string; bg: string; Icon: any }> = {
  commodity: { label: "Commodity", color: "#2e7d32", bg: "#4CAF5015", Icon: TrendingUp },
  shipping:  { label: "Shipping",  color: "#1565c0", bg: "#2196F315", Icon: Ship },
  currency:  { label: "Currency",  color: "#92681a", bg: "#C6A96920", Icon: DollarSign },
  weather:   { label: "Weather",   color: "#e65100", bg: "#FF980015", Icon: Cloud },
  regulation:{ label: "Regulation",color: "#6a1b9a", bg: "#9C27B015", Icon: Globe },
  market:    { label: "Market",    color: "#0F3D2E", bg: "#0F3D2E12", Icon: Newspaper },
  risk:      { label: "Risk",      color: "#c62828", bg: "#F4433615", Icon: AlertTriangle },
  ai:        { label: "AI Insight",color: "#00838f", bg: "#00BCD415", Icon: Cpu },
}

// ─── Static seed articles (shown when localStorage has no approved news) ───────
const SEED_ARTICLES: TradeNews[] = [
  {
    id: "seed-1",
    title: "Basmati Rice Export Target Raised to $2.1 Billion for FY2026",
    source: "Pakistan Bureau of Statistics",
    sourceUrl: "#",
    category: "commodity",
    region: "Pakistan",
    summary: "The federal government has revised upward its basmati rice export target for FY2026 to $2.1 billion, citing robust demand from Gulf Cooperation Council nations and the European Union. Trade officials attribute the increase to Pakistan's improved grain quality certification framework and competitive farmgate pricing.",
    content: "",
    status: "approved",
    featured: true,
    ogCommentary: "This target revision aligns with OG Exports' strategic push to deepen our GCC footprint. Buyers can now lock in forward contracts at currently favourable rates before the seasonal price adjustment expected in Q3.",
    publishedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "high",
    tags: ["basmati", "rice", "exports", "FY2026", "GCC"],
    views: 1840,
  },
  {
    id: "seed-2",
    title: "Sesame Seed Prices Surge 2.1% Amid Strong Chinese Demand",
    source: "Reuters Commodities Desk",
    sourceUrl: "#",
    category: "commodity",
    region: "Global",
    summary: "Pakistani sesame seed export prices climbed 2.1% week-on-week as Chinese confectionery and oil-press industries ramped up procurement ahead of the Lunar New Year stocking cycle. Market analysts anticipate further upward pressure through Q1 2026.",
    content: "",
    status: "approved",
    featured: true,
    ogCommentary: "We recommend existing buyers to confirm volumes before end of month. Spot availability is tightening at Karachi and Port Qasim warehouses, and freight bookings on the KPTE–Shanghai lane are filling fast.",
    publishedAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "high",
    tags: ["sesame", "seeds", "China", "prices", "oilseeds"],
    views: 1320,
  },
  {
    id: "seed-3",
    title: "Pakistan–UAE Trade Volume Crosses $12 Billion Milestone",
    source: "Ministry of Commerce Pakistan",
    sourceUrl: "#",
    category: "market",
    region: "Pakistan / UAE",
    summary: "Bilateral trade between Pakistan and the UAE surpassed the $12 billion mark in calendar year 2025, driven by agricultural commodities, textiles and re-exports. The two countries are now advancing a Comprehensive Economic Partnership Agreement to further reduce tariffs on agri-food products.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "The CEPA negotiations create a strategic window for OG Exports clients to establish UAE-based trading entities that can benefit from preferential duty rates on rice, sesame and spices headed to the wider GCC market.",
    publishedAt: new Date(Date.now() - 8 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "medium",
    tags: ["UAE", "bilateral-trade", "CEPA", "agri-food"],
    views: 980,
  },
  {
    id: "seed-4",
    title: "New Phytosanitary Requirements for EU-Bound Rice Shipments Effective March 2026",
    source: "European Commission DG SANTE",
    sourceUrl: "#",
    category: "regulation",
    region: "Europe",
    summary: "The European Commission has published updated phytosanitary import conditions for rice originating from South Asia, mandating enhanced mycotoxin testing and a new traceability certificate. Shipments without the revised documentation will be detained at EU border inspection posts from 1 March 2026.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "All OG Exports EU-bound rice shipments are being pre-registered under the new framework. We advise buyers to factor an additional 4–6 days for third-party lab testing when planning order lead times.",
    publishedAt: new Date(Date.now() - 14 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "high",
    tags: ["EU", "phytosanitary", "rice", "regulation", "compliance"],
    views: 2100,
  },
  {
    id: "seed-5",
    title: "State Bank of Pakistan Raises Trade Finance Limit for Agricultural Exporters",
    source: "State Bank of Pakistan",
    sourceUrl: "#",
    category: "currency",
    region: "Pakistan",
    summary: "The State Bank of Pakistan has increased the Export Finance Scheme (EFS) credit ceiling for SME agricultural exporters by 35%, effective immediately. The measure is aimed at bridging working-capital gaps during the paddy procurement and milling season.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "This policy shift reduces pre-shipment financing costs significantly. OG Exports clients can now access larger volumes at subsidised markup rates — contact our trade finance desk for structured facility proposals.",
    publishedAt: new Date(Date.now() - 18 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "medium",
    tags: ["SBP", "trade-finance", "EFS", "agriculture", "SME"],
    views: 750,
  },
  {
    id: "seed-6",
    title: "Karachi Port Congestion Alert: Container Dwell Times Rise to 9 Days",
    source: "Karachi Port Trust",
    sourceUrl: "#",
    category: "shipping",
    region: "Pakistan",
    summary: "Container dwell times at Karachi Port have climbed to an average of 9 days due to a backlog of import containers blocking yard capacity. Exporters are advised to coordinate with freight forwarders for early gate-in bookings and to consider Port Qasim as an alternative load port.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "OG Exports logistics team is actively rerouting select shipments via QICT at Port Qasim. Clients with imminent LCLs should contact us immediately to assess whether vessel rebooking is required.",
    publishedAt: new Date(Date.now() - 22 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "high",
    tags: ["Karachi", "port", "congestion", "shipping", "logistics"],
    views: 1650,
  },
  {
    id: "seed-7",
    title: "PKR Strengthens 1.8% Against USD Following IMF Quarterly Review",
    source: "Bloomberg Markets",
    sourceUrl: "#",
    category: "currency",
    region: "Pakistan",
    summary: "The Pakistani Rupee gained 1.8% against the US dollar in a single session after the IMF completed its quarterly programme review and released the next tranche of a $7 billion Extended Fund Facility. Market participants expect near-term stability in the 278–282 band.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "Short-term PKR appreciation may slightly compress export realisations. We recommend exporters forward-sell a portion of upcoming receivables to lock in current rates before any further movement.",
    publishedAt: new Date(Date.now() - 30 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "medium",
    tags: ["PKR", "USD", "IMF", "forex", "currency"],
    views: 890,
  },
  {
    id: "seed-8",
    title: "Global Shipping Rates on Asia–Europe Lanes Jump 18% in Two Weeks",
    source: "Drewry World Container Index",
    sourceUrl: "#",
    category: "shipping",
    region: "Global",
    summary: "The Drewry World Container Index for the Shanghai–Rotterdam corridor rose 18% over a fortnight, driven by Red Sea diversions pushing vessels around the Cape of Good Hope and adding 12–14 days to transit. Spot rates for 40-foot containers now exceed $4,200.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "This freight spike will affect cost calculations for European buyers. OG Exports is actively negotiating block-space agreements with three carriers to shield clients from spot market volatility.",
    publishedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "high",
    tags: ["shipping", "freight-rates", "Red-Sea", "Asia-Europe", "containers"],
    views: 1430,
  },
  {
    id: "seed-9",
    title: "India Lifts Rice Export Ban — Pakistan Faces Renewed Competition in African Markets",
    source: "Financial Times",
    sourceUrl: "#",
    category: "market",
    region: "South Asia / Africa",
    summary: "India has removed the Minimum Export Price restriction on non-basmati white rice, reopening competition in key African import markets. Pakistan's rice exporters, who gained significant market share during the 18-month Indian ban, now face pricing pressure in East and West African corridors.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "This is the most significant competitive development of 2025. OG Exports recommends differentiated positioning through quality certifications, longer payment terms and tailored packaging — factors where Pakistani exporters retain a real advantage.",
    publishedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "high",
    tags: ["India", "rice", "Africa", "competition", "non-basmati"],
    views: 2450,
  },
  {
    id: "seed-10",
    title: "Spice Export Revenue Climbs 22% Year-on-Year Driven by Coriander and Cumin",
    source: "TDAP Export Data",
    sourceUrl: "#",
    category: "commodity",
    region: "Pakistan",
    summary: "Pakistan's spice export revenue surged 22% year-on-year in the first half of FY2026, with coriander seed and cumin leading gains. Strong demand from the United Kingdom, Germany and the United Arab Emirates has absorbed new crop arrivals well above TDAP's initial forecast.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "Spices are becoming a high-value diversification stream for traditional rice and sesame buyers. OG Exports now carries certified organic coriander and cumin — ask your account manager for availability.",
    publishedAt: new Date(Date.now() - 60 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "medium",
    tags: ["spices", "coriander", "cumin", "TDAP", "UK", "Germany"],
    views: 670,
  },
  {
    id: "seed-11",
    title: "Saudi Arabia Mandates Halal Traceability Certificates for All Food Imports from 2026",
    source: "Saudi Food & Drug Authority",
    sourceUrl: "#",
    category: "regulation",
    region: "Saudi Arabia",
    summary: "The Saudi Food & Drug Authority has announced that all food product imports must carry blockchain-anchored halal traceability certificates from January 2026. The regulation applies to processed and raw agricultural commodities, including grains, pulses and oilseeds.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "OG Exports is already onboarding a blockchain traceability partner. Clients exporting to KSA should initiate halal re-certification immediately to avoid shipment delays at Jeddah Islamic Port.",
    publishedAt: new Date(Date.now() - 72 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "high",
    tags: ["Saudi-Arabia", "halal", "traceability", "blockchain", "regulation"],
    views: 1780,
  },
  {
    id: "seed-12",
    title: "El Niño Pattern Could Reduce Punjab Wheat Yield by Up to 12% — Met Office",
    source: "Pakistan Meteorological Department",
    sourceUrl: "#",
    category: "weather",
    region: "Pakistan",
    summary: "Pakistan's Meteorological Department has issued a seasonal outlook warning that an emerging El Niño pattern may reduce above-normal temperatures during the winter wheat growing period in Punjab, potentially cutting yields by 8–12% versus last year's record harvest.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "Weather-driven supply tightness typically translates to price firming by April–May. Buyers with forward requirements should consider locking in wheat-based product commitments in the near term.",
    publishedAt: new Date(Date.now() - 84 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "medium",
    tags: ["weather", "El-Nino", "wheat", "Punjab", "yield"],
    views: 530,
  },
  {
    id: "seed-13",
    title: "AI Demand Forecasting Cuts Overstock Losses by 31% for Top Pakistan Agri-Exporters",
    source: "McKinsey Agri-Tech Report",
    sourceUrl: "#",
    category: "ai",
    region: "Global",
    summary: "A McKinsey study found that Pakistani agricultural exporters deploying AI-driven demand forecasting tools reduced overstock write-offs by an average of 31% and improved on-time delivery rates by 19 percentage points. The report highlights machine-learning models trained on commodity price data, vessel tracking and buyer purchasing histories.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "OG Exports is piloting an AI demand-planning module for high-volume clients. Early results show a 27% reduction in shipment mismatches. Reach out to explore early access to the beta programme.",
    publishedAt: new Date(Date.now() - 96 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "low",
    tags: ["AI", "forecasting", "agri-tech", "logistics", "innovation"],
    views: 420,
  },
  {
    id: "seed-14",
    title: "Houthi Drone Strike Forces Rerouting of Three Pakistan-Bound Tankers",
    source: "Lloyd's List Intelligence",
    sourceUrl: "#",
    category: "risk",
    region: "Red Sea / Gulf of Aden",
    summary: "Three product tankers carrying edible oil bound for Pakistan were forced to reroute via the Cape of Good Hope after Houthi militants targeted vessels in the southern Red Sea on consecutive nights. Insurance war-risk premiums on Gulf of Aden transits have risen to 1.2% of cargo value.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "Edible oil import costs for Pakistan are rising sharply. OG Exports trade risk desk is monitoring the situation closely and offering War Risk Advisory briefings to impacted clients on request.",
    publishedAt: new Date(Date.now() - 110 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "high",
    tags: ["Red-Sea", "Houthi", "risk", "tankers", "edible-oil"],
    views: 3100,
  },
  {
    id: "seed-15",
    title: "China Increases Palm Olein Import Quota, Boosting Demand for Pakistan-Sourced Blends",
    source: "Reuters Asia",
    sourceUrl: "#",
    category: "market",
    region: "China / Pakistan",
    summary: "China's National Development and Reform Commission has increased the palm olein import quota by 15% for 2026, creating incremental demand for blended vegetable oils. Pakistani traders are exploring opportunities to supply value-added blended products that meet Chinese national food safety standards.",
    content: "",
    status: "approved",
    featured: false,
    ogCommentary: "This quota increase creates a meaningful export opportunity for Pakistani oil refiners and blenders. OG Exports can facilitate introductions to vetted Chinese importers. Contact our Asia trade desk for buyer profiles.",
    publishedAt: new Date(Date.now() - 120 * 3600000).toISOString(),
    scheduledFor: "",
    priority: "medium",
    tags: ["China", "palm-olein", "vegetable-oil", "quota", "import"],
    views: 610,
  },
]

function getBookmarks(): Set<string> {
  try {
    const arr: string[] = JSON.parse(localStorage.getItem(BOOKMARKS_KEY) || "[]")
    return new Set(arr)
  } catch { return new Set() }
}

function saveBookmarks(set: Set<string>) {
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify([...set]))
  } catch { /* ignore */ }
}

function formatDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
}
function formatTime(iso: string) {
  const d = new Date(iso)
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + " PKT"
}
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return "Just now"
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return formatDate(iso)
}
function estimateReadTime(text: string): number {
  const words = (text || "").split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function getApprovedNewsFallback(): TradeNews[] {
  return SEED_ARTICLES
}

const ALL_CATS = ["all", "commodity", "shipping", "currency", "weather", "regulation", "market", "risk", "ai"]

const SEED_TICKER_ITEMS = [
  "🔴 LIVE: Basmati rice export target raised to $2.1B for FY2026",
  "📈 Sesame seed prices surge 2.1% amid strong Chinese demand",
  "🇵🇰 Pakistan–UAE trade volume crosses $12B milestone",
  "⚠️ New phytosanitary requirements for EU-bound rice shipments effective March 2026",
  "🏦 State Bank raises trade finance limit for agricultural exporters",
]

// ─── Live Market Prices Bar ────────────────────────────────────────────────────
function LivePriceBar() {
  const [prices, setPrices] = useState<LivePrice[]>(getCachedPrices())
  const [loading, setLoading] = useState(getCachedPrices().length === 0)
  const [lastUpdate, setLastUpdate] = useState(getCacheAge())

  useEffect(() => {
    let mounted = true
    fetchLivePrices().then(p => {
      if (!mounted) return
      setPrices(p)
      setLoading(false)
      setLastUpdate("Just now")
    }).catch(() => {
      if (!mounted) return
      setPrices(FALLBACK_PRICES)
      setLoading(false)
    })
    const interval = setInterval(() => {
      fetchLivePrices(true).then(p => {
        if (!mounted) return
        setPrices(p)
        setLastUpdate("Just now")
      })
    }, 15 * 60 * 1000)
    return () => { mounted = false; clearInterval(interval) }
  }, [])

  const display = prices.length > 0 ? prices : FALLBACK_PRICES

  return (
    <div style={{ background: "#050f0a", borderBottom: "1px solid rgba(198,169,105,0.2)" }} className="py-1.5">
      <div className="container px-4 md:px-6 flex items-center gap-4">
        {/* Label */}
        <div className="shrink-0 flex items-center gap-1.5 pr-3"
          style={{ borderRight: "1px solid rgba(198,169,105,0.25)" }}>
          <span className="w-2 h-2 rounded-full animate-pulse"
            style={{ background: loading ? "#EAB308" : "#4CAF50" }} />
          <span className="text-[10px] font-black uppercase tracking-widest whitespace-nowrap"
            style={{ color: GOLD }}>Live Markets</span>
        </div>
        {/* Scrollable price strip */}
        <div className="overflow-x-auto scrollbar-none flex-1">
          <div className="flex items-center gap-5 whitespace-nowrap">
            {display.map(p => {
              const isUp = p.changePct >= 0
              const pctStr = (isUp ? "+" : "") + p.changePct.toFixed(2) + "%"
              const priceStr = p.symbol === "PKR/USD"
                ? p.price.toFixed(1)
                : p.price >= 1000
                  ? p.price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                  : p.price.toFixed(2)
              return (
                <div key={p.symbol} className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs">{p.icon}</span>
                  <span className="text-[11px] font-bold" style={{ color: "rgba(255,255,255,0.7)" }}>
                    {p.symbol}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-white">{priceStr}</span>
                  {p.changePct !== 0 && (
                    <span className="text-[10px] font-semibold"
                      style={{ color: isUp ? "#4CAF50" : "#EF4444" }}>
                      {isUp ? "▲" : "▼"} {pctStr}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div className="shrink-0 text-[10px] hidden sm:block" style={{ color: "rgba(255,255,255,0.25)" }}>
          {loading ? "Fetching…" : lastUpdate}
        </div>
      </div>
    </div>
  )
}

// ─── Breaking News Ticker ──────────────────────────────────────────────────────
function BreakingTicker({ items }: { items: string[] }) {
  const doubled = [...items, ...items]
  return (
    <div style={{ background: "#0a2318", borderBottom: "1px solid rgba(198,169,105,0.25)" }}
      className="overflow-hidden py-2.5">
      <div className="flex items-center gap-0">
        {/* BREAKING label */}
        <div className="shrink-0 flex items-center gap-2 px-4 py-0.5 z-10"
          style={{ background: "#c62828", borderRight: "2px solid rgba(198,169,105,0.4)" }}>
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          <span className="text-white text-[10px] font-black uppercase tracking-[0.15em] whitespace-nowrap">Breaking</span>
        </div>
        {/* Scrolling text */}
        <div className="overflow-hidden flex-1">
          <div className="ticker-scroll flex gap-0 whitespace-nowrap" style={{ display: "inline-flex" }}>
            {doubled.map((item, i) => (
              <span key={i} className="inline-flex items-center text-[11px] font-medium px-6"
                style={{ color: "rgba(255,255,255,0.85)" }}>
                {item}
                <span className="mx-6 opacity-30" style={{ color: GOLD }}>◆</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Newsletter Banner ─────────────────────────────────────────────────────────
function NewsletterBanner() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) setSubmitted(true)
  }

  return (
    <div className="rounded-2xl overflow-hidden my-10"
      style={{
        background: `linear-gradient(135deg, ${EMERALD} 0%, #1a5c40 60%, #0a2318 100%)`,
        border: `1px solid rgba(198,169,105,0.25)`,
        boxShadow: `0 8px 40px rgba(15,61,46,0.25)`,
      }}>
      <div className="px-6 py-8 md:px-10 flex flex-col md:flex-row items-center gap-6">
        {/* Icon */}
        <div className="shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(198,169,105,0.15)", border: "1px solid rgba(198,169,105,0.3)" }}>
          <Mail className="w-6 h-6" style={{ color: GOLD }} />
        </div>
        {/* Text */}
        <div className="flex-1 text-center md:text-left">
          <h3 className="text-white font-heading font-bold text-xl mb-1">
            Stay Ahead of the Market
          </h3>
          <p className="text-white/65 text-sm leading-relaxed">
            Get weekly trade intelligence — price alerts, regulatory updates &amp; OG Exports commentary — straight to your inbox.
          </p>
        </div>
        {/* Form */}
        {submitted ? (
          <div className="shrink-0 flex items-center gap-2 px-5 py-3 rounded-xl"
            style={{ background: "rgba(76,175,80,0.2)", border: "1px solid rgba(76,175,80,0.4)" }}>
            <span className="text-green-400 text-sm font-semibold">✓ You're subscribed!</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="shrink-0 flex gap-2 w-full md:w-auto">
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="px-4 h-10 rounded-xl text-sm outline-none flex-1 md:w-52"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "white",
              }}
            />
            <button
              type="submit"
              className="px-5 h-10 rounded-xl text-sm font-bold whitespace-nowrap transition-all hover:opacity-90"
              style={{ background: GOLD, color: "#1a0e00" }}>
              Subscribe
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function TradeNews() {
  const [news, setNews] = useState<TradeNews[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState("all")
  const [sortMode, setSortMode] = useState<SortMode>("latest")
  const [selectedNews, setSelectedNews] = useState<TradeNews | null>(null)
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())

  useEffect(() => {
    setBookmarks(getBookmarks())
    let cancelled = false
    setLoading(true)
    fetchPublicTradeNews({ per_page: 50 })
      .then((articles) => {
        if (cancelled) return
        setNews(articles.length > 0 ? articles : getApprovedNewsFallback())
      })
      .catch(() => {
        if (!cancelled) setNews(getApprovedNewsFallback())
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  function toggleBookmark(id: string) {
    setBookmarks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      saveBookmarks(next)
      return next
    })
  }

  // Filter
  const filtered = news.filter(n => {
    const matchSearch = !search ||
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.summary.toLowerCase().includes(search.toLowerCase()) ||
      n.source.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === "all" || n.category === filterCat
    const matchBookmark = sortMode !== "bookmarks" || bookmarks.has(n.id)
    return matchSearch && matchCat && matchBookmark
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortMode === "trending") return (b.views || 0) - (a.views || 0)
    return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  })

  const featured = sorted.filter(n => n.featured)
  const regular = sorted.filter(n => !n.featured)

  const featuredForDisplay = sortMode === "bookmarks" ? sorted.filter(n => n.featured) : featured
  const regularForDisplay = sortMode === "bookmarks" ? sorted.filter(n => !n.featured) : regular

  return (
    <>
      {/* Hero */}
      <section className="relative pt-12 pb-16 overflow-hidden" style={{ background: EMERALD }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(198,169,105,0.12) 0%, transparent 70%)"
        }} />
        <div className="container px-4 md:px-6 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
              style={{ background: "rgba(198,169,105,0.15)", color: GOLD, border: "1px solid rgba(198,169,105,0.3)" }}>
              <Globe className="w-3.5 h-3.5" />
              Global Trade Intelligence
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-white leading-[1.08] mb-4">
              World News &<br />
              <span style={{ color: GOLD }}>Market Alerts</span>
            </h1>
            <p className="text-lg text-white/70 max-w-xl leading-relaxed">
              Live global trade intelligence — commodity prices, port disruptions, shipping routes,
              oil markets &amp; regulatory changes affecting worldwide import/export.
            </p>
          </div>
        </div>
      </section>

      {/* Live Market Prices */}
      <LivePriceBar />

      {/* Breaking News Ticker */}
      <BreakingTicker items={
        news.length > 0
          ? news.slice(0, 8).map(n =>
              (n.priority === "high" ? "🔴 " : n.category === "commodity" ? "📈 " : n.category === "shipping" ? "🚢 " : "📰 ") + n.title
            )
          : SEED_TICKER_ITEMS
      } />

      {/* Stats bar */}
      <div style={{ background: "#0a2d20", borderBottom: "1px solid rgba(198,169,105,0.2)" }}>
        <div className="container px-4 md:px-6">
          <div className="flex items-center gap-8 py-3 overflow-x-auto scrollbar-none text-xs font-medium text-white/60">
            <span>{loading ? "Loading…" : `${news.length} Verified Articles`}</span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <span>{news.filter(n => n.featured).length} Featured</span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <span>{bookmarks.size} Bookmarked</span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <span>Updated: {news[0] ? timeAgo(news[0].publishedAt) : "—"}</span>
            <span style={{ color: "rgba(255,255,255,0.2)" }}>|</span>
            <span style={{ color: GREEN }}>● Admin-Verified</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="sticky top-20 z-30 bg-white border-b shadow-sm" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
        <div className="container px-4 md:px-6 py-3">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            {/* Left: Category pills + Sort */}
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {ALL_CATS.map(cat => {
                const cfg = cat !== "all" ? CAT_CONFIG[cat as NewsCat] : null
                const isActive = filterCat === cat && sortMode !== "bookmarks"
                return (
                  <button
                    key={cat}
                    onClick={() => { setFilterCat(cat); setSortMode("latest") }}
                    className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all border"
                    style={{
                      background: isActive ? (cfg?.color || EMERALD) : "transparent",
                      color: isActive ? "white" : (cfg?.color || "#374151"),
                      borderColor: isActive ? "transparent" : "rgba(0,0,0,0.12)",
                    }}
                  >
                    {cat === "all" ? "All News" : cfg?.label}
                  </button>
                )
              })}
              {/* Divider */}
              <span className="w-px bg-black/10 mx-1 self-stretch" />
              {/* Trending */}
              <button
                onClick={() => { setSortMode(sortMode === "trending" ? "latest" : "trending"); setFilterCat("all") }}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1"
                style={{
                  background: sortMode === "trending" ? "#e65100" : "transparent",
                  color: sortMode === "trending" ? "white" : "#e65100",
                  borderColor: sortMode === "trending" ? "transparent" : "rgba(230,81,0,0.3)",
                }}
              >
                <Flame className="w-3 h-3" /> Trending
              </button>
              {/* Bookmarks */}
              <button
                onClick={() => { setSortMode(sortMode === "bookmarks" ? "latest" : "bookmarks"); setFilterCat("all") }}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1"
                style={{
                  background: sortMode === "bookmarks" ? GOLD : "transparent",
                  color: sortMode === "bookmarks" ? "white" : "#92681a",
                  borderColor: sortMode === "bookmarks" ? "transparent" : "rgba(198,169,105,0.4)",
                }}
              >
                <Bookmark className="w-3 h-3" />
                Bookmarks {bookmarks.size > 0 && <span className="ml-0.5">({bookmarks.size})</span>}
              </button>
            </div>
            {/* Right: Article count + Search */}
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-muted-foreground hidden sm:block">
                {filtered.length} article{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search news..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 pr-4 h-9 w-56 text-sm rounded-lg border outline-none transition-all"
                  style={{ borderColor: "rgba(0,0,0,0.15)", background: "hsl(60 17% 97%)" }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-12">
        {filtered.length === 0 && sortMode === "bookmarks" ? (
          <div className="text-center py-24">
            <Bookmark className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Bookmarks Yet</h3>
            <p className="text-sm text-muted-foreground">Star articles to save them here for quick reference.</p>
          </div>
        ) : filtered.length === 0 && search ? (
          <div className="text-center py-20">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p className="text-muted-foreground">No articles match your search.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Featured */}
            {featuredForDisplay.length > 0 && sortMode !== "trending" && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  <Star className="w-4 h-4" style={{ color: GOLD, fill: GOLD }} />
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Featured Stories</span>
                </div>
                <div className="grid md:grid-cols-2 gap-5">
                  {featuredForDisplay.map(n => (
                    <NewsCard
                      key={n.id}
                      n={n}
                      featured
                      bookmarked={bookmarks.has(n.id)}
                      onSelect={setSelectedNews}
                      onToggleBookmark={toggleBookmark}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter Banner — between featured and regular */}
            {featuredForDisplay.length > 0 && regularForDisplay.length > 0 && sortMode !== "trending" && (
              <NewsletterBanner />
            )}

            {/* Regular / Trending */}
            {(regularForDisplay.length > 0 || sortMode === "trending") && (
              <div>
                <div className="flex items-center gap-2 mb-5">
                  {sortMode === "trending" ? (
                    <>
                      <Flame className="w-4 h-4" style={{ color: "#e65100" }} />
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#e65100" }}>Trending Now</span>
                    </>
                  ) : sortMode === "bookmarks" ? (
                    <>
                      <BookmarkCheck className="w-4 h-4" style={{ color: GOLD }} />
                      <span className="text-xs font-bold uppercase tracking-widest" style={{ color: GOLD }}>Your Bookmarks</span>
                    </>
                  ) : featuredForDisplay.length > 0 ? (
                    <>
                      <Newspaper className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Latest News</span>
                    </>
                  ) : null}
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {(sortMode === "trending" ? sorted : regularForDisplay).map(n => (
                    <NewsCard
                      key={n.id}
                      n={n}
                      bookmarked={bookmarks.has(n.id)}
                      onSelect={setSelectedNews}
                      onToggleBookmark={toggleBookmark}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Newsletter at bottom if no featured */}
            {featuredForDisplay.length === 0 && sortMode === "latest" && (
              <NewsletterBanner />
            )}
          </div>
        )}
      </div>

      {/* Article Modal */}
      {selectedNews && (
        <ArticleModal
          news={selectedNews}
          allNews={news}
          bookmarked={bookmarks.has(selectedNews.id)}
          onToggleBookmark={toggleBookmark}
          onClose={() => setSelectedNews(null)}
          onSelectRelated={setSelectedNews}
        />
      )}
    </>
  )
}

// ─── Article Modal ─────────────────────────────────────────────────────────────
function ArticleModal({
  news: n,
  allNews,
  bookmarked,
  onToggleBookmark,
  onClose,
  onSelectRelated,
}: {
  news: TradeNews
  allNews: TradeNews[]
  bookmarked: boolean
  onToggleBookmark: (id: string) => void
  onClose: () => void
  onSelectRelated: (n: TradeNews) => void
}) {
  const [copied, setCopied] = useState(false)
  const [reportSent, setReportSent] = useState(false)

  const cfg = CAT_CONFIG[n.category]
  const readTime = estimateReadTime(n.summary + " " + n.content + " " + n.ogCommentary)

  // Related articles: same category, different id, up to 3
  const related = allNews.filter(a => a.id !== n.id && a.category === n.category).slice(0, 3)

  function copyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const whatsappText = encodeURIComponent(`${n.title} — via OG Exports Trade Intelligence`)
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div className="h-1 w-full rounded-t-3xl" style={{ background: cfg.color }} />

        <div className="p-6 md:p-8">
          {/* Header row: badges + close */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: cfg.bg, color: cfg.color }}>
                <cfg.Icon className="w-3 h-3" />
                {cfg.label}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                style={{
                  background: n.priority === "high" ? "#F4433615" : n.priority === "medium" ? "#FF980015" : "#4CAF5015",
                  color: n.priority === "high" ? "#c62828" : n.priority === "medium" ? "#e65100" : "#2e7d32"
                }}>
                {n.priority.toUpperCase()} PRIORITY
              </span>
              {n.featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                  style={{ background: GOLD + "20", color: "#92681a" }}>
                  <Star className="w-3 h-3" style={{ fill: GOLD }} /> Featured
                </span>
              )}
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-muted shrink-0"
              style={{ border: "1px solid rgba(0,0,0,0.1)" }}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          <h2 className="text-2xl font-heading font-bold leading-tight mb-4" style={{ color: "#1a2332" }}>
            {n.title}
          </h2>

          {/* Meta row */}
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground mb-5 pb-5 border-b">
            {/* Author avatar */}
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                style={{ background: cfg.color }}>
                {n.source[0]?.toUpperCase()}
              </span>
              {n.source}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> {n.region}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDate(n.publishedAt)} · {formatTime(n.publishedAt)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" style={{ color: GOLD }} />
              {readTime} min read
            </span>
            {n.views && (
              <span className="flex items-center gap-1">
                👁 {n.views.toLocaleString()} views
              </span>
            )}
          </div>

          {/* Summary */}
          <p className="text-sm leading-relaxed mb-5" style={{ color: "#4a5568" }}>
            {n.summary}
          </p>

          {/* OG Commentary */}
          {n.ogCommentary && (
            <div className="rounded-2xl p-4 mb-5" style={{ background: EMERALD + "08", border: `1px solid ${EMERALD}20` }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full" style={{ background: EMERALD }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: EMERALD }}>OG Exports Commentary</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#2d4a3e" }}>
                {n.ogCommentary}
              </p>
            </div>
          )}

          {/* Tags */}
          {n.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              {n.tags.map(tag => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: "rgba(0,0,0,0.05)", color: "#6b7280" }}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Share buttons */}
          <div className="rounded-xl p-4 mb-5" style={{ background: "hsl(60 17% 97%)", border: "1px solid rgba(0,0,0,0.06)" }}>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
              <Share2 className="w-3 h-3" /> Share this article
            </p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border hover:bg-white"
                style={{ borderColor: "rgba(0,0,0,0.12)", color: "#374151" }}>
                <Link2 className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy Link"}
              </button>
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border hover:bg-white"
                style={{ borderColor: "rgba(37,211,102,0.4)", color: "#128c7e" }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.549 4.116 1.515 5.849L.057 23.429a.5.5 0 0 0 .623.603l5.701-1.504A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.942 0-3.754-.556-5.282-1.515l-.379-.228-3.938 1.038 1.038-3.85-.249-.395A9.817 9.817 0 0 1 2.182 12C2.182 6.578 6.578 2.182 12 2.182S21.818 6.578 21.818 12 17.422 21.818 12 21.818z"/>
                </svg>
                WhatsApp
              </a>
              <a
                href={linkedinUrl}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border hover:bg-white"
                style={{ borderColor: "rgba(10,102,194,0.35)", color: "#0a66c2" }}>
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </a>
            </div>
          </div>

          {/* Related Articles */}
          {related.length > 0 && (
            <div className="mb-5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
                <ChevronRight className="w-3 h-3" /> Related Articles
              </p>
              <div className="space-y-2">
                {related.map(r => {
                  const rcfg = CAT_CONFIG[r.category]
                  return (
                    <button
                      key={r.id}
                      onClick={() => onSelectRelated(r)}
                      className="w-full text-left rounded-xl px-4 py-3 transition-all border flex items-start gap-3 hover:shadow-sm"
                      style={{ borderColor: "rgba(0,0,0,0.08)", background: "white" }}
                    >
                      <span className="w-5 h-5 rounded-full flex items-center justify-center mt-0.5 shrink-0"
                        style={{ background: rcfg.bg }}>
                        <rcfg.Icon className="w-3 h-3" style={{ color: rcfg.color }} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold leading-snug line-clamp-2" style={{ color: "#1a2332" }}>
                          {r.title}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "#9ca3af" }}>
                          {timeAgo(r.publishedAt)} · {r.source}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-1" />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Actions row */}
          <div className="flex flex-wrap gap-2 items-center justify-between pt-4 border-t" style={{ borderColor: "rgba(0,0,0,0.07)" }}>
            <div className="flex gap-2 flex-wrap">
              {n.sourceUrl && n.sourceUrl !== "#" && (
                <a href={n.sourceUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
                  style={{ background: EMERALD, color: "white" }}>
                  <ExternalLink className="w-4 h-4" /> Read Full Article
                </a>
              )}
              <button
                onClick={() => onToggleBookmark(n.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border"
                style={{
                  borderColor: "rgba(198,169,105,0.4)",
                  color: "#92681a",
                  background: "rgba(198,169,105,0.08)"
                }}>
                {bookmarked ? <BookmarkCheck className="w-4 h-4" style={{ color: GOLD }} /> : <Bookmark className="w-4 h-4" />}
                {bookmarked ? "Bookmarked" : "Bookmark"}
              </button>
              <button onClick={onClose}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border transition-all hover:bg-muted"
                style={{ borderColor: "rgba(0,0,0,0.15)" }}>
                Close
              </button>
            </div>
            {/* Report error */}
            <button
              onClick={() => setReportSent(true)}
              className="text-[11px] flex items-center gap-1 transition-all hover:opacity-70"
              style={{ color: reportSent ? "#2e7d32" : "#9ca3af" }}>
              <AlertCircle className="w-3 h-3" />
              {reportSent ? "Report received — thank you" : "Report an Error"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── News Card ─────────────────────────────────────────────────────────────────
function NewsCard({
  n,
  featured,
  bookmarked,
  onSelect,
  onToggleBookmark,
}: {
  n: TradeNews
  featured?: boolean
  bookmarked: boolean
  onSelect: (n: TradeNews) => void
  onToggleBookmark: (id: string) => void
}) {
  const cfg = CAT_CONFIG[n.category]
  const readTime = estimateReadTime(n.summary + " " + n.content)

  return (
    <article
      onClick={() => onSelect(n)}
      className="group rounded-2xl border overflow-hidden transition-all duration-300 cursor-pointer relative"
      style={{
        background: "white",
        borderColor: featured ? GOLD + "40" : "rgba(0,0,0,0.08)",
        boxShadow: featured ? `0 4px 24px ${GOLD}18` : "0 1px 8px rgba(0,0,0,0.04)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"
        ;(e.currentTarget as HTMLElement).style.boxShadow = featured
          ? `0 8px 32px ${GOLD}28`
          : "0 8px 28px rgba(0,0,0,0.10)"
        ;(e.currentTarget as HTMLElement).style.borderColor = featured ? GOLD + "70" : "rgba(0,0,0,0.15)"
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)"
        ;(e.currentTarget as HTMLElement).style.boxShadow = featured ? `0 4px 24px ${GOLD}18` : "0 1px 8px rgba(0,0,0,0.04)"
        ;(e.currentTarget as HTMLElement).style.borderColor = featured ? GOLD + "40" : "rgba(0,0,0,0.08)"
      }}
    >
      {/* Top accent */}
      <div className="h-1 w-full" style={{ background: cfg.color }} />

      {/* Bookmark button */}
      <button
        onClick={e => { e.stopPropagation(); onToggleBookmark(n.id) }}
        className="absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-all z-10 hover:scale-110"
        style={{
          background: bookmarked ? GOLD + "20" : "rgba(0,0,0,0.04)",
          border: `1px solid ${bookmarked ? GOLD + "50" : "rgba(0,0,0,0.08)"}`,
        }}>
        {bookmarked
          ? <BookmarkCheck className="w-3.5 h-3.5" style={{ color: GOLD }} />
          : <Bookmark className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3 pr-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
              style={{ background: cfg.bg, color: cfg.color }}>
              <cfg.Icon className="w-3 h-3" />
              {cfg.label}
            </span>
            {featured && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold"
                style={{ color: GOLD }}>
                <Star className="w-3 h-3" style={{ fill: GOLD }} /> Featured
              </span>
            )}
          </div>
          <span className="text-[11px] font-medium shrink-0 mt-0.5"
            style={{
              color: n.priority === "high" ? "#c62828" : n.priority === "medium" ? "#e65100" : "#6b7280",
              background: n.priority === "high" ? "#F4433610" : n.priority === "medium" ? "#FF980010" : "#4CAF5010",
              padding: "2px 8px", borderRadius: "999px"
            }}>
            {n.priority}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-heading font-bold leading-snug mb-2 group-hover:opacity-80 transition-opacity"
          style={{ fontSize: featured ? "17px" : "15px", color: "#1a2332" }}>
          {n.title}
        </h3>

        {/* Summary */}
        <p className="text-xs leading-relaxed mb-4 line-clamp-3" style={{ color: "#6b7280" }}>
          {n.summary}
        </p>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 pt-3 border-t" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground min-w-0">
            <span className="flex items-center gap-1 shrink-0">
              {/* Author initial circle */}
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shrink-0"
                style={{ background: cfg.color }}>
                {n.source[0]?.toUpperCase()}
              </span>
              {n.source}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <MapPin className="w-3 h-3" /> {n.region}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground shrink-0">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readTime}m
            </span>
            <span className="opacity-40">·</span>
            <span>{timeAgo(n.publishedAt)}</span>
          </div>
        </div>
      </div>
    </article>
  )
}
