import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Globe, Newspaper, Star, TrendingUp, Ship, DollarSign, Cloud, Calendar,
  Bell, BarChart2, Settings, CheckCircle2, XCircle, Clock, Archive,
  Edit3, Eye, Plus, RefreshCw, Search, AlertTriangle, ExternalLink,
  Rss, Database, Tag, Flag, Activity, ArrowUp, ArrowDown, X, Save,
  Zap, MapPin, Filter, MoreVertical, Thermometer, Wind, ChevronRight,
  Layers, FileText, Users, Shield
} from "lucide-react"
import { addAuditLog } from "@/lib/admin-data"
import {
  fetchAdminTradeNews,
  syncGoogleNews,
  updateTradeNewsArticle,
  markGoogleSyncDone,
  getLastFetchTime,
  getNextFetchTime,
  type ApiTradeNews,
} from "@/lib/auto-news-fetch"
import { api } from "@/lib/api"

const GOLD = "#D4A012"
const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"

type NewsStatus = "pending" | "approved" | "rejected" | "scheduled" | "archived"
type NewsCat = "commodity" | "shipping" | "currency" | "weather" | "regulation" | "market" | "risk" | "ai"

interface TradeNews {
  id: string
  title: string
  source: string
  sourceUrl: string
  category: NewsCat
  region: string
  summary: string
  content: string
  status: NewsStatus
  featured: boolean
  ogCommentary: string
  publishedAt: string
  scheduledFor: string
  priority: "high" | "medium" | "low"
  tags: string[]
}

function fromApi(n: ApiTradeNews): TradeNews {
  return {
    id: n.id,
    title: n.title,
    source: n.source,
    sourceUrl: n.sourceUrl,
    category: n.category,
    region: n.region,
    summary: n.summary,
    content: n.content,
    status: n.status,
    featured: n.featured,
    ogCommentary: n.ogCommentary,
    publishedAt: n.publishedAt,
    scheduledFor: n.scheduledFor,
    priority: n.priority,
    tags: n.tags,
  }
}

interface TradeAlert {
  id: string
  title: string
  type: string
  severity: "critical" | "high" | "medium" | "low"
  condition: string
  active: boolean
  triggered: boolean
  createdAt: string
}

interface CalendarEvent {
  id: string
  title: string
  type: string
  date: string
  country: string
  description: string
  priority: "high" | "medium" | "low"
}

const SEED_ALERTS: TradeAlert[] = [
  { id: "al1", title: "Basmati Price Drop Alert", type: "price", severity: "high", condition: "Basmati futures drop >5% in 24h", active: true, triggered: false, createdAt: "2026-07-01" },
  { id: "al2", title: "PKR/USD Volatility Watch", type: "currency", severity: "critical", condition: "PKR moves >3% in single session", active: true, triggered: true, createdAt: "2026-07-05" },
  { id: "al3", title: "Monsoon Flood Risk", type: "weather", severity: "high", condition: "Rainfall >150mm in basmati regions", active: true, triggered: false, createdAt: "2026-07-10" },
  { id: "al4", title: "Freight Rate Surge", type: "shipping", severity: "medium", condition: "Asia-Europe freight >$3500/TEU", active: true, triggered: false, createdAt: "2026-07-08" },
  { id: "al5", title: "EU Regulation Update", type: "regulation", severity: "high", condition: "New MRL limits published", active: true, triggered: true, createdAt: "2026-07-11" },
]

const SEED_CALENDAR: CalendarEvent[] = [
  { id: "ce1", title: "Gulfood Manufacturing Dubai", type: "market", date: "2026-09-15", country: "UAE", description: "Annual food manufacturing expo. OG Exports exhibiting premium rice and spice range.", priority: "high" },
  { id: "ce2", title: "EU MRL Regulation Effective Date", type: "regulatory", date: "2026-09-01", country: "EU", description: "New pesticide residue limits take effect for all agricultural imports.", priority: "high" },
  { id: "ce3", title: "Kharif Crop Harvest — Punjab", type: "inspection", date: "2026-10-01", country: "Pakistan", description: "Basmati harvest inspection and grading begins. Quality control team deployment.", priority: "high" },
  { id: "ce4", title: "Pakistan-Saudi Arabia Trade MOU Review", type: "regulatory", date: "2026-08-20", country: "Saudi Arabia", description: "Bilateral trade framework renewal. Includes agricultural export quotas review.", priority: "medium" },
  { id: "ce5", title: "ANUGA Trade Fair Cologne", type: "market", date: "2026-10-04", country: "Germany", description: "World's largest food and beverage trade fair. European buyer meetings scheduled.", priority: "high" },
]

const COMMODITY_DATA = [
  { name: "Basmati Rice (1121)", price: 1420, change: +2.8, unit: "$/MT", market: "Chicago" },
  { name: "Non-Basmati Rice", price: 620, change: -1.2, unit: "$/MT", market: "Bangkok" },
  { name: "Yellow Maize", price: 285, change: +0.6, unit: "$/MT", market: "CBOT" },
  { name: "Sesame Seeds", price: 1850, change: +5.4, unit: "$/MT", market: "Rotterdam" },
  { name: "Green Cardamom", price: 8200, change: +1.1, unit: "$/MT", market: "Kochi" },
  { name: "Himalayan Pink Salt", price: 340, change: -0.3, unit: "$/MT", market: "Lahore" },
  { name: "Mangoes (Chaunsa)", price: 1100, change: +3.2, unit: "$/MT", market: "Multan" },
  { name: "Potatoes", price: 180, change: -2.1, unit: "$/MT", market: "Lahore" },
]

const CURRENCY_DATA = [
  { pair: "PKR/USD", rate: 278.45, change: +1.2, trend: "up" },
  { pair: "PKR/EUR", rate: 302.10, change: +0.8, trend: "up" },
  { pair: "PKR/GBP", rate: 355.60, change: -0.4, trend: "down" },
  { pair: "PKR/AED", rate: 75.80, change: +0.2, trend: "up" },
  { pair: "PKR/SAR", rate: 74.25, change: +0.1, trend: "up" },
  { pair: "USD/EUR", rate: 1.085, change: -0.3, trend: "down" },
]

const SHIPPING_DATA = [
  { route: "Karachi → Dubai", rate: 650, change: -45, transit: "3–4 days", vessel: "Weekly" },
  { route: "Karachi → Rotterdam", rate: 2850, change: +120, transit: "22–25 days", vessel: "Bi-weekly" },
  { route: "Karachi → Shanghai", rate: 1200, change: -80, transit: "14–16 days", vessel: "Weekly" },
  { route: "Karachi → Jeddah", rate: 720, change: +30, transit: "5–6 days", vessel: "Twice weekly" },
  { route: "Karachi → London", rate: 3100, change: +150, transit: "25–28 days", vessel: "Weekly" },
]

const WEATHER_DATA = [
  { region: "Punjab (Basmati Belt)", status: "Watch", condition: "Heavy monsoon expected", temp: 38, humidity: 78, risk: "high" },
  { region: "Sindh (Rice Fields)", status: "Normal", condition: "Clear, moderate heat", temp: 42, humidity: 62, risk: "low" },
  { region: "KPK (Spice Regions)", status: "Advisory", condition: "Flash flood risk in valleys", temp: 32, humidity: 71, risk: "medium" },
  { region: "Gilgit-Baltistan (Cardamom)", status: "Normal", condition: "Favorable growing conditions", temp: 22, humidity: 58, risk: "low" },
  { region: "Khewra (Salt Mines)", status: "Normal", condition: "Stable, dry conditions", temp: 36, humidity: 45, risk: "low" },
]

const ALERT_STORAGE_KEY = "og-trade-alerts"
const CALENDAR_STORAGE_KEY = "og-trade-calendar"
const SEEDED_KEY = "og-trade-intel-seeded-v2"

function initTradeData() {
  if (localStorage.getItem(SEEDED_KEY)) return
  localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(SEED_ALERTS))
  localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(SEED_CALENDAR))
  localStorage.setItem(SEEDED_KEY, "1")
}

function getAlerts(): TradeAlert[] {
  try { return JSON.parse(localStorage.getItem(ALERT_STORAGE_KEY) || "[]") } catch { return [] }
}
function saveAlerts(a: TradeAlert[]) { localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(a)) }
function getCalendar(): CalendarEvent[] {
  try { return JSON.parse(localStorage.getItem(CALENDAR_STORAGE_KEY) || "[]") } catch { return [] }
}
function saveCalendar(c: CalendarEvent[]) { localStorage.setItem(CALENDAR_STORAGE_KEY, JSON.stringify(c)) }

const CAT_COLOR: Record<NewsCat, string> = {
  commodity: "#4CAF50", shipping: "#2196F3", currency: "#D4A012",
  weather: "#FF9800", regulation: "#9C27B0", market: "#0F3D2E",
  risk: "#F44336", ai: "#00BCD4"
}
const STATUS_COLOR: Record<NewsStatus, string> = {
  pending: "#FF9800", approved: "#4CAF50", rejected: "#F44336",
  scheduled: "#2196F3", archived: "#9E9E9E"
}

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard2 },
  { id: "queue", label: "News Queue", icon: Newspaper },
  { id: "featured", label: "Featured", icon: Star },
  { id: "markets", label: "Market Intelligence", icon: TrendingUp },
  { id: "calendar", label: "Trade Calendar", icon: Calendar },
  { id: "alerts", label: "Smart Alerts", icon: Bell },
  { id: "analytics", label: "Analytics", icon: BarChart2 },
  { id: "config", label: "Configuration", icon: Settings },
]

function LayoutDashboard2(props: { className?: string }) {
  return <Activity {...props} />
}

const RSS_SOURCES = [
  { name: "Google Cloud News", url: "google", icon: "🔎" },
]

export default function AdminTradeIntelligence() {
  const [tab, setTab] = useState("dashboard")
  const [news, setNews] = useState<TradeNews[]>([])
  const [alerts, setAlerts] = useState<TradeAlert[]>([])
  const [calendar, setCalendar] = useState<CalendarEvent[]>([])
  const [search, setSearch] = useState("")
  const [filterCat, setFilterCat] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [editNews, setEditNews] = useState<TradeNews | null>(null)
  const [viewNews, setViewNews] = useState<TradeNews | null>(null)
  const [scheduleModal, setScheduleModal] = useState<TradeNews | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")
  const [addCalModal, setAddCalModal] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({})
  const [marketTab, setMarketTab] = useState("commodity")
  const [addAlertModal, setAddAlertModal] = useState(false)
  const [newAlert, setNewAlert] = useState<Partial<TradeAlert>>({})
  const [addNewsModal, setAddNewsModal] = useState(false)
  const [newNewsForm, setNewNewsForm] = useState<Partial<TradeNews>>({})
  const [fetching, setFetching] = useState(false)
  const [fetchingSource, setFetchingSource] = useState("")
  const [fetchMsg, setFetchMsg] = useState("")
  const [autoFetchRunning, setAutoFetchRunning] = useState(false)
  const [autoFetchMsg, setAutoFetchMsg] = useState("")
  const [autoFetchTimes, setAutoFetchTimes] = useState({ last: getLastFetchTime(), next: getNextFetchTime() })
  const [newsLoading, setNewsLoading] = useState(true)
  const [newsLoadError, setNewsLoadError] = useState("")

  async function loadNewsFromApi() {
    setNewsLoading(true)
    setNewsLoadError("")
    try {
      const rows = await fetchAdminTradeNews({ per_page: 100 })
      setNews(rows.map(fromApi))
    } catch (e: any) {
      setNews([])
      setNewsLoadError(e?.message || "Failed to load trade news from API")
    } finally {
      setNewsLoading(false)
    }
  }

  async function fetchLiveNews(_sourceUrl: string, sourceName: string) {
    setFetching(true)
    setFetchingSource(sourceName)
    setFetchMsg("")
    try {
      const result = await syncGoogleNews()
      markGoogleSyncDone()
      setAutoFetchTimes({ last: getLastFetchTime(), next: getNextFetchTime() })
      await loadNewsFromApi()
      if (result.errors.length && result.imported === 0) {
        setFetchMsg(`✗ ${result.errors[0]}`)
      } else {
        setFetchMsg(`✓ ${result.imported} new articles via ${result.provider} (${result.skipped} skipped)`)
      }
    } catch (e: any) {
      setFetchMsg(`✗ Could not sync Google news: ${e?.message || "request failed"}`)
    } finally {
      setFetching(false)
      setFetchingSource("")
    }
  }

  useEffect(() => {
    initTradeData()
    setAlerts(getAlerts())
    setCalendar(getCalendar())
    void loadNewsFromApi()
  }, [])

  async function updateNewsStatus(id: string, status: NewsStatus, commentary?: string) {
    const current = news.find(n => n.id === id)
    if (!current || !/^\d+$/.test(id)) {
      setNews(prev => prev.map(n => n.id === id ? { ...n, status, ogCommentary: commentary ?? n.ogCommentary } : n))
      return
    }
    const tags = (current.tags || []).filter(t => !["rejected", "archived", "scheduled"].includes(t))
    if (status === "rejected") tags.push("rejected")
    if (status === "archived") tags.push("archived")
    if (status === "scheduled") tags.push("scheduled")
    try {
      const updated = await updateTradeNewsArticle(id, {
        published: status === "approved",
        featured: current.featured,
        content: commentary ?? current.content,
        tags,
        type: "trade",
      })
      setNews(prev => prev.map(n => n.id === id ? fromApi(updated) : n))
      addAuditLog(`Trade news ${id} → ${status}`, "Content")
    } catch {
      setFetchMsg("✗ Failed to update article status")
    }
  }

  async function toggleFeatured(id: string) {
    const current = news.find(n => n.id === id)
    if (!current || !/^\d+$/.test(id)) return
    try {
      const updated = await updateTradeNewsArticle(id, {
        featured: !current.featured,
        published: current.status === "approved",
        type: "trade",
      })
      setNews(prev => prev.map(n => n.id === id ? fromApi(updated) : n))
    } catch {}
  }

  async function saveEditNews(n: TradeNews) {
    if (!/^\d+$/.test(n.id)) {
      setEditNews(null)
      return
    }
    try {
      const updated = await updateTradeNewsArticle(n.id, {
        title: n.title,
        category: n.category,
        excerpt: n.summary,
        content: n.content || n.summary,
        source: n.source,
        source_url: n.sourceUrl,
        region: n.region,
        published: n.status === "approved",
        featured: n.featured,
        tags: n.tags,
        type: "trade",
      })
      setNews(prev => prev.map(x => x.id === n.id ? fromApi(updated) : x))
      setEditNews(null)
      addAuditLog(`Trade news ${n.id} edited`, "Content")
    } catch {
      setFetchMsg("✗ Failed to save article")
    }
  }

  async function handleSchedule() {
    if (!scheduleModal || !scheduleDate) return
    await updateNewsStatus(scheduleModal.id, "scheduled")
    setScheduleModal(null)
    setScheduleDate("")
  }

  async function addNewsItem() {
    try {
      const res: any = await api.post("/api/admin/cms/news", {
        title: newNewsForm.title || "Untitled",
        category: (newNewsForm.category as NewsCat) || "market",
        excerpt: newNewsForm.summary || "",
        content: newNewsForm.summary || "",
        source: newNewsForm.source || "Manual Entry",
        source_url: "#",
        region: newNewsForm.region || "Global",
        published: false,
        featured: false,
        type: "trade",
        tags: [],
        published_at: new Date().toISOString(),
      })
      const mapped = fromApi({
        id: String(res?.data?.id ?? res?.id),
        title: newNewsForm.title || "",
        source: newNewsForm.source || "Manual Entry",
        sourceUrl: "#",
        category: (newNewsForm.category as NewsCat) || "market",
        region: newNewsForm.region || "Global",
        summary: newNewsForm.summary || "",
        content: "",
        status: "pending",
        featured: false,
        ogCommentary: "",
        publishedAt: new Date().toISOString(),
        scheduledFor: "",
        priority: "medium",
        tags: [],
      })
      // Prefer server mapping when available
      try {
        await loadNewsFromApi()
      } catch {
        setNews(prev => [mapped, ...prev])
      }
      setAddNewsModal(false)
      setNewNewsForm({})
    } catch {
      setFetchMsg("✗ Failed to create article")
    }
  }

  function addCalEvent() {
    const e: CalendarEvent = {
      id: `ce${Date.now()}`, title: newEvent.title || "", type: newEvent.type || "market",
      date: newEvent.date || "", country: newEvent.country || "", description: newEvent.description || "",
      priority: (newEvent.priority as "high" | "medium" | "low") || "medium"
    }
    const updated = [...calendar, e]; saveCalendar(updated); setCalendar(updated); setAddCalModal(false); setNewEvent({})
  }

  function deleteCalEvent(id: string) {
    const updated = calendar.filter(c => c.id !== id); saveCalendar(updated); setCalendar(updated)
  }

  function toggleAlert(id: string) {
    const updated = alerts.map(a => a.id === id ? { ...a, active: !a.active } : a)
    saveAlerts(updated); setAlerts(updated)
  }

  function addAlertItem() {
    const a: TradeAlert = {
      id: `al${Date.now()}`, title: newAlert.title || "", type: newAlert.type || "price",
      severity: (newAlert.severity as "critical" | "high" | "medium" | "low") || "medium",
      condition: newAlert.condition || "", active: true, triggered: false, createdAt: new Date().toISOString().split("T")[0]
    }
    const updated = [...alerts, a]; saveAlerts(updated); setAlerts(updated); setAddAlertModal(false); setNewAlert({})
  }

  function deleteAlert(id: string) {
    const updated = alerts.filter(a => a.id !== id); saveAlerts(updated); setAlerts(updated)
  }

  const filteredNews = news.filter(n => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.source.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === "all" || n.category === filterCat
    const matchStatus = filterStatus === "all" || n.status === filterStatus
    return matchSearch && matchCat && matchStatus
  })

  const pendingCount = news.filter(n => n.status === "pending").length
  const approvedCount = news.filter(n => n.status === "approved").length
  const featuredCount = news.filter(n => n.featured).length
  const triggeredAlerts = alerts.filter(a => a.triggered && a.active).length

  return (
    <AdminLayout title="Global Trade Intelligence Center" subtitle="AI-powered trade news, market data & intelligence management">
      {/* Tab Bar */}
      <div className="border-b mb-6" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
        <div className="flex items-center gap-1 overflow-x-auto pb-0 scrollbar-none">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 relative"
              style={{
                borderBottomColor: tab === t.id ? GOLD : "transparent",
                color: tab === t.id ? EMERALD : "#6b7280",
              }}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
              {t.id === "queue" && pendingCount > 0 && (
                <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ml-1" style={{ background: "#FF9800" }}>
                  {pendingCount}
                </span>
              )}
              {t.id === "alerts" && triggeredAlerts > 0 && (
                <span className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center ml-1" style={{ background: "#F44336" }}>
                  {triggeredAlerts}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── DASHBOARD TAB ── */}
      {tab === "dashboard" && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Pending Review", value: pendingCount, icon: Clock, color: "#FF9800" },
              { label: "Published Today", value: approvedCount, icon: CheckCircle2, color: GREEN },
              { label: "Featured Articles", value: featuredCount, icon: Star, color: GOLD },
              { label: "Active Alerts", value: alerts.filter(a => a.active).length, icon: Bell, color: "#F44336" },
            ].map(kpi => (
              <Card key={kpi.label} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: kpi.color + "18" }}>
                    <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: EMERALD }}>{kpi.value}</div>
                    <div className="text-xs text-muted-foreground">{kpi.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Intelligence Widgets */}
          <div className="grid md:grid-cols-3 gap-4">
            {/* Commodity Widget */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: GREEN }} /> Commodity Prices
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {COMMODITY_DATA.slice(0, 5).map(c => (
                  <div key={c.name} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1">{c.name}</span>
                    <span className="font-semibold mr-2">{c.price} {c.unit}</span>
                    <span className="flex items-center gap-0.5 font-medium" style={{ color: c.change > 0 ? GREEN : "#F44336" }}>
                      {c.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(c.change)}%
                    </span>
                  </div>
                ))}
                <button onClick={() => { setTab("markets"); setMarketTab("commodity") }} className="text-xs font-medium mt-2 flex items-center gap-1" style={{ color: GOLD }}>
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </CardContent>
            </Card>

            {/* Currency Widget */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <DollarSign className="w-4 h-4" style={{ color: GOLD }} /> Currency Rates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {CURRENCY_DATA.slice(0, 5).map(c => (
                  <div key={c.pair} className="flex items-center justify-between text-xs">
                    <span className="font-mono font-semibold">{c.pair}</span>
                    <span className="font-semibold mr-2">{c.rate}</span>
                    <span className="flex items-center gap-0.5 font-medium" style={{ color: c.change > 0 ? GREEN : "#F44336" }}>
                      {c.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(c.change)}%
                    </span>
                  </div>
                ))}
                <button onClick={() => { setTab("markets"); setMarketTab("currency") }} className="text-xs font-medium mt-2 flex items-center gap-1" style={{ color: GOLD }}>
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </CardContent>
            </Card>

            {/* Weather Widget */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Cloud className="w-4 h-4" style={{ color: "#2196F3" }} /> Weather Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {WEATHER_DATA.slice(0, 4).map(w => (
                  <div key={w.region} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground truncate flex-1">{w.region}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium ml-2" style={{
                      background: w.risk === "high" ? "#F44336" + "18" : w.risk === "medium" ? "#FF9800" + "18" : "#4CAF50" + "18",
                      color: w.risk === "high" ? "#F44336" : w.risk === "medium" ? "#FF9800" : "#4CAF50"
                    }}>
                      {w.status}
                    </span>
                  </div>
                ))}
                <button onClick={() => { setTab("markets"); setMarketTab("weather") }} className="text-xs font-medium mt-2 flex items-center gap-1" style={{ color: GOLD }}>
                  View all <ChevronRight className="w-3 h-3" />
                </button>
              </CardContent>
            </Card>
          </div>

          {/* Shipping + Upcoming Events */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Ship className="w-4 h-4" style={{ color: "#2196F3" }} /> Shipping Intelligence
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {SHIPPING_DATA.map(s => (
                  <div key={s.route} className="flex items-center justify-between text-xs py-1.5 border-b last:border-0" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <div>
                      <div className="font-medium">{s.route}</div>
                      <div className="text-muted-foreground">{s.transit} · {s.vessel}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">${s.rate}/TEU</div>
                      <div className="flex items-center gap-0.5 justify-end" style={{ color: s.change > 0 ? "#F44336" : "#4CAF50" }}>
                        {s.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        ${Math.abs(s.change)}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: "#9C27B0" }} /> Upcoming Trade Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                {calendar.slice(0, 5).map(e => (
                  <div key={e.id} className="flex items-start gap-3 text-xs py-1.5 border-b last:border-0" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <div className="w-10 h-10 rounded-lg flex flex-col items-center justify-center shrink-0 text-white" style={{ background: EMERALD }}>
                      <div className="text-[10px] font-bold">{new Date(e.date).toLocaleDateString("en", { month: "short" })}</div>
                      <div className="text-sm font-bold leading-none">{new Date(e.date).getDate()}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{e.title}</div>
                      <div className="text-muted-foreground flex items-center gap-1"><Flag className="w-3 h-3" /> {e.country}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Recent News */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Newspaper className="w-4 h-4" style={{ color: GOLD }} /> Latest News Feed
              </CardTitle>
              <Button size="sm" variant="outline" onClick={() => setTab("queue")} className="text-xs">
                Review Queue ({pendingCount})
              </Button>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {newsLoadError && (
                <p className="text-xs text-red-600 px-2">{newsLoadError}</p>
              )}
              {newsLoading && (
                <p className="text-xs text-muted-foreground px-2 py-4">Loading articles…</p>
              )}
              {!newsLoading && news.length === 0 && !newsLoadError && (
                <p className="text-xs text-muted-foreground px-2 py-4">No trade articles yet. Use Sync Google News below.</p>
              )}
              {news.slice(0, 6).map(n => (
                <div key={n.id} className="flex items-start gap-3 py-2 border-b last:border-0 cursor-pointer hover:bg-muted/30 rounded px-2 -mx-2 transition-colors" style={{ borderColor: "rgba(0,0,0,0.06)" }}
                  onClick={() => setViewNews(n)}>
                  <div className="w-2 h-2 rounded-full mt-2 shrink-0" style={{ background: CAT_COLOR[n.category] }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{n.title}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span>{n.source}</span>
                      <span>·</span>
                      <span>{new Date(n.publishedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: STATUS_COLOR[n.status] + "20", color: STATUS_COLOR[n.status] }}>
                    {n.status}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── NEWS QUEUE TAB ── */}
      {tab === "queue" && (
        <div className="space-y-4">

          {/* Live News Fetch Panel */}
          <Card className="border-0 shadow-sm" style={{ background: "linear-gradient(135deg, #0F3D2E08 0%, #D4A01208 100%)", borderLeft: `3px solid ${EMERALD}` }}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Rss className="w-4 h-4" style={{ color: EMERALD }} />
                <span className="font-semibold text-sm" style={{ color: EMERALD }}>Fetch Live Trade News</span>
                <span className="text-xs text-muted-foreground ml-1">— Syncs from Google Cloud / Gemini into the Pending queue for review.</span>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {RSS_SOURCES.map(src => (
                  <button
                    key={src.name}
                    disabled={fetching}
                    onClick={() => fetchLiveNews(src.url, src.name)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                    style={{
                      borderColor: fetchingSource === src.name ? EMERALD : "rgba(0,0,0,0.12)",
                      background: fetchingSource === src.name ? EMERALD + "15" : "white",
                      color: fetchingSource === src.name ? EMERALD : "#374151",
                      opacity: fetching && fetchingSource !== src.name ? 0.5 : 1,
                      cursor: fetching ? "not-allowed" : "pointer",
                    }}
                  >
                    {fetchingSource === src.name ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <span>{src.icon}</span>
                    )}
                    {src.name}
                  </button>
                ))}
                <button
                  disabled={fetching}
                  onClick={async () => {
                    await fetchLiveNews("google", "Google Cloud News")
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all"
                  style={{ borderColor: GOLD, background: GOLD + "15", color: "#92681a", cursor: fetching ? "not-allowed" : "pointer" }}
                >
                  <Zap className="w-3 h-3" /> Sync Google News
                </button>
              </div>
              {fetchMsg && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                  style={{ background: fetchMsg.startsWith("✓") ? "#4CAF5015" : "#F4433615", color: fetchMsg.startsWith("✓") ? "#2e7d32" : "#c62828" }}>
                  {fetchMsg.startsWith("✓") ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
                  {fetchMsg}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auto-Fetch Schedule Status */}
          <Card className="border-0 shadow-sm" style={{ background: "linear-gradient(135deg, #4CAF5008 0%, #0F3D2E08 100%)", borderLeft: `3px solid ${GREEN}` }}>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: GREEN }} />
                  <span className="font-semibold text-sm" style={{ color: EMERALD }}>Auto-Fetch Active</span>
                  <span className="text-xs text-muted-foreground">— server syncs Google news hourly into Pending queue</span>
                </div>
                <button
                  disabled={autoFetchRunning}
                  onClick={async () => {
                    setAutoFetchRunning(true)
                    setAutoFetchMsg("")
                    try {
                      const result = await syncGoogleNews()
                      markGoogleSyncDone()
                      setAutoFetchTimes({ last: getLastFetchTime(), next: getNextFetchTime() })
                      await loadNewsFromApi()
                      setAutoFetchMsg(
                        result.imported > 0
                          ? `✓ ${result.imported} new articles added to Pending queue`
                          : result.errors[0]
                            ? `✗ ${result.errors[0]}`
                            : "✓ No new articles found (already up to date)",
                      )
                    } catch (e: any) {
                      setAutoFetchMsg(`✗ ${e?.message || "Sync failed"}`)
                    }
                    setAutoFetchRunning(false)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0"
                  style={{ background: GREEN, color: "white", opacity: autoFetchRunning ? 0.7 : 1, cursor: autoFetchRunning ? "not-allowed" : "pointer" }}
                >
                  {autoFetchRunning ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  {autoFetchRunning ? "Fetching..." : "Fetch Now (Override)"}
                </button>
              </div>
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                <span><Clock className="w-3 h-3 inline mr-1" />Last auto-fetch: <strong className="text-foreground">{autoFetchTimes.last}</strong></span>
                <span><Activity className="w-3 h-3 inline mr-1" />Next auto-fetch: <strong className="text-foreground">{autoFetchTimes.next}</strong></span>
              </div>
              {autoFetchMsg && (
                <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg mt-2"
                  style={{ background: autoFetchMsg.startsWith("✓") ? "#4CAF5015" : "#F4433615", color: autoFetchMsg.startsWith("✓") ? "#2e7d32" : "#c62828" }}>
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  {autoFetchMsg}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {newsLoading && <span className="text-xs text-muted-foreground self-center">Loading articles…</span>}
              {newsLoadError && <span className="text-xs text-red-600 self-center">{newsLoadError}</span>}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <Input className="pl-9 h-9 w-64 text-sm" placeholder="Search articles..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <select className="h-9 px-3 rounded-md border border-input bg-background text-sm" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="all">All Categories</option>
                {["commodity", "shipping", "currency", "weather", "regulation", "market", "risk", "ai"].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
              <select className="h-9 px-3 rounded-md border border-input bg-background text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="all">All Status</option>
                {["pending", "approved", "rejected", "scheduled", "archived"].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <Button size="sm" onClick={() => setAddNewsModal(true)} style={{ background: EMERALD, color: "white" }}>
              <Plus className="w-4 h-4 mr-1" /> Add Article
            </Button>
          </div>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                      <th className="text-left px-4 py-3 font-medium">Article</th>
                      <th className="text-left px-4 py-3 font-medium">Category</th>
                      <th className="text-left px-4 py-3 font-medium">Source</th>
                      <th className="text-left px-4 py-3 font-medium">Priority</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium">Date</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNews.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-muted-foreground text-sm">No articles found</td></tr>
                    ) : filteredNews.map(n => (
                      <tr key={n.id} className="border-b hover:bg-muted/20 transition-colors" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                        <td className="px-4 py-3 max-w-xs">
                          <div className="font-medium truncate text-sm">{n.title}</div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">{n.summary.slice(0, 60)}...</div>
                          {n.featured && <span className="inline-flex items-center gap-0.5 text-[10px] font-bold mt-1" style={{ color: GOLD }}><Star className="w-3 h-3" /> Featured</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: CAT_COLOR[n.category] + "20", color: CAT_COLOR[n.category] }}>
                            {n.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{n.source}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{
                            background: n.priority === "high" ? "#F4433620" : n.priority === "medium" ? "#FF980020" : "#4CAF5020",
                            color: n.priority === "high" ? "#F44336" : n.priority === "medium" ? "#FF9800" : "#4CAF50"
                          }}>
                            {n.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: STATUS_COLOR[n.status] + "20", color: STATUS_COLOR[n.status] }}>
                            {n.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{new Date(n.publishedAt).toLocaleDateString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => setViewNews(n)} title="View" className="p-1.5 rounded hover:bg-muted transition-colors"><Eye className="w-3.5 h-3.5 text-muted-foreground" /></button>
                            <button onClick={() => setEditNews({ ...n })} title="Edit" className="p-1.5 rounded hover:bg-muted transition-colors"><Edit3 className="w-3.5 h-3.5 text-muted-foreground" /></button>
                            {n.status === "pending" && <>
                              <button onClick={() => updateNewsStatus(n.id, "approved")} title="Approve" className="p-1.5 rounded hover:bg-muted transition-colors"><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /></button>
                              <button onClick={() => { setScheduleModal(n) }} title="Schedule" className="p-1.5 rounded hover:bg-muted transition-colors"><Clock className="w-3.5 h-3.5 text-blue-500" /></button>
                              <button onClick={() => updateNewsStatus(n.id, "rejected")} title="Reject" className="p-1.5 rounded hover:bg-muted transition-colors"><XCircle className="w-3.5 h-3.5 text-red-500" /></button>
                            </>}
                            {n.status === "approved" && (
                              <button onClick={() => updateNewsStatus(n.id, "archived")} title="Archive" className="p-1.5 rounded hover:bg-muted transition-colors"><Archive className="w-3.5 h-3.5 text-muted-foreground" /></button>
                            )}
                            <button onClick={() => toggleFeatured(n.id)} title={n.featured ? "Unfeature" : "Feature"} className="p-1.5 rounded hover:bg-muted transition-colors">
                              <Star className="w-3.5 h-3.5" style={{ color: n.featured ? GOLD : undefined, fill: n.featured ? GOLD : "none" }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── FEATURED TAB ── */}
      {tab === "featured" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-base">Featured News Management</h3>
              <p className="text-sm text-muted-foreground">Control which articles appear prominently for users</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {news.filter(n => n.status === "approved").map(n => (
              <Card key={n.id} className={`border-0 shadow-sm transition-all ${n.featured ? "ring-2" : ""}`} style={{ ringColor: GOLD }}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: CAT_COLOR[n.category] + "20", color: CAT_COLOR[n.category] }}>{n.category}</span>
                        {n.featured && <span className="text-xs flex items-center gap-1 font-bold" style={{ color: GOLD }}><Star className="w-3 h-3 fill-current" /> Featured</span>}
                      </div>
                      <h4 className="font-semibold text-sm leading-tight mb-1">{n.title}</h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">{n.summary}</p>
                      {n.ogCommentary && (
                        <div className="mt-2 p-2 rounded text-xs italic" style={{ background: GOLD + "15", borderLeft: `3px solid ${GOLD}` }}>
                          <span className="font-semibold not-italic" style={{ color: GOLD }}>OG Commentary: </span>{n.ogCommentary}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => toggleFeatured(n.id)}
                      className="p-2 rounded-lg transition-all shrink-0"
                      style={{ background: n.featured ? GOLD + "20" : "rgba(0,0,0,0.05)" }}
                    >
                      <Star className="w-5 h-5" style={{ color: n.featured ? GOLD : "#9CA3AF", fill: n.featured ? GOLD : "none" }} />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── MARKETS TAB ── */}
      {tab === "markets" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              { id: "commodity", label: "Commodities", icon: TrendingUp },
              { id: "currency", label: "Currency", icon: DollarSign },
              { id: "shipping", label: "Shipping", icon: Ship },
              { id: "weather", label: "Weather", icon: Cloud },
            ].map(mt => (
              <button key={mt.id} onClick={() => setMarketTab(mt.id)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  background: marketTab === mt.id ? EMERALD : "rgba(0,0,0,0.05)",
                  color: marketTab === mt.id ? "white" : "#374151"
                }}>
                <mt.icon className="w-4 h-4" /> {mt.label}
              </button>
            ))}
          </div>

          {marketTab === "commodity" && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" style={{ color: GREEN }} /> Commodity Price Intelligence</span>
                  <span className="text-xs font-normal text-muted-foreground flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Live data</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <th className="text-left px-4 py-3 font-medium">Commodity</th>
                    <th className="text-right px-4 py-3 font-medium">Price</th>
                    <th className="text-right px-4 py-3 font-medium">24h Change</th>
                    <th className="text-left px-4 py-3 font-medium">Market</th>
                  </tr></thead>
                  <tbody>
                    {COMMODITY_DATA.map(c => (
                      <tr key={c.name} className="border-b hover:bg-muted/20" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                        <td className="px-4 py-3 font-medium">{c.name}</td>
                        <td className="px-4 py-3 text-right font-bold">{c.price} <span className="text-xs text-muted-foreground font-normal">{c.unit}</span></td>
                        <td className="px-4 py-3 text-right">
                          <span className="flex items-center justify-end gap-1 font-semibold" style={{ color: c.change > 0 ? GREEN : "#F44336" }}>
                            {c.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            {Math.abs(c.change)}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{c.market}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {marketTab === "currency" && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><DollarSign className="w-4 h-4" style={{ color: GOLD }} /> Currency Market Intelligence</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <th className="text-left px-4 py-3 font-medium">Currency Pair</th>
                    <th className="text-right px-4 py-3 font-medium">Rate</th>
                    <th className="text-right px-4 py-3 font-medium">24h Change</th>
                    <th className="text-left px-4 py-3 font-medium">Trend</th>
                  </tr></thead>
                  <tbody>
                    {CURRENCY_DATA.map(c => (
                      <tr key={c.pair} className="border-b hover:bg-muted/20" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                        <td className="px-4 py-3 font-mono font-bold">{c.pair}</td>
                        <td className="px-4 py-3 text-right font-bold">{c.rate}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="flex items-center justify-end gap-1 font-semibold" style={{ color: c.change > 0 ? GREEN : "#F44336" }}>
                            {c.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            {Math.abs(c.change)}%
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 h-4">
                            {[...Array(8)].map((_, i) => (
                              <div key={i} className="w-3 rounded-sm" style={{ background: c.change > 0 ? GREEN : "#F44336", opacity: 0.3 + (i * 0.09), height: `${30 + Math.random() * 70}%`, alignSelf: "flex-end" }} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {marketTab === "shipping" && (
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Ship className="w-4 h-4" style={{ color: "#2196F3" }} /> Shipping Intelligence</CardTitle></CardHeader>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
                    <th className="text-left px-4 py-3 font-medium">Trade Route</th>
                    <th className="text-right px-4 py-3 font-medium">Rate ($/TEU)</th>
                    <th className="text-right px-4 py-3 font-medium">WoW Change</th>
                    <th className="text-left px-4 py-3 font-medium">Transit Time</th>
                    <th className="text-left px-4 py-3 font-medium">Frequency</th>
                  </tr></thead>
                  <tbody>
                    {SHIPPING_DATA.map(s => (
                      <tr key={s.route} className="border-b hover:bg-muted/20" style={{ borderColor: "rgba(0,0,0,0.04)" }}>
                        <td className="px-4 py-3 font-medium">{s.route}</td>
                        <td className="px-4 py-3 text-right font-bold">${s.rate.toLocaleString()}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="flex items-center justify-end gap-1 font-semibold" style={{ color: s.change > 0 ? "#F44336" : GREEN }}>
                            {s.change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            ${Math.abs(s.change)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{s.transit}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{s.vessel}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {marketTab === "weather" && (
            <div className="grid md:grid-cols-2 gap-4">
              {WEATHER_DATA.map(w => (
                <Card key={w.region} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-sm">{w.region}</div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Thermometer className="w-3 h-3" /> {w.temp}°C · <Wind className="w-3 h-3" /> {w.humidity}% humidity
                        </div>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-xs font-bold" style={{
                        background: w.risk === "high" ? "#F4433620" : w.risk === "medium" ? "#FF980020" : "#4CAF5020",
                        color: w.risk === "high" ? "#F44336" : w.risk === "medium" ? "#FF9800" : "#4CAF50"
                      }}>
                        {w.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg text-xs" style={{ background: "rgba(0,0,0,0.04)" }}>
                      <Cloud className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">{w.condition}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CALENDAR TAB ── */}
      {tab === "calendar" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Trade Calendar Management</h3>
              <p className="text-sm text-muted-foreground">Upcoming trade events, deadlines & market dates</p>
            </div>
            <Button size="sm" onClick={() => setAddCalModal(true)} style={{ background: EMERALD, color: "white" }}>
              <Plus className="w-4 h-4 mr-1" /> Add Event
            </Button>
          </div>
          <div className="space-y-3">
            {calendar.sort((a, b) => a.date.localeCompare(b.date)).map(e => (
              <Card key={e.id} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 text-white" style={{ background: EMERALD }}>
                    <div className="text-[10px] font-bold uppercase">{new Date(e.date).toLocaleDateString("en", { month: "short" })}</div>
                    <div className="text-xl font-bold leading-none">{new Date(e.date).getDate()}</div>
                    <div className="text-[10px]">{new Date(e.date).getFullYear()}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{e.title}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: e.priority === "high" ? "#F4433620" : e.priority === "medium" ? "#FF980020" : "#4CAF5020",
                        color: e.priority === "high" ? "#F44336" : e.priority === "medium" ? "#FF9800" : "#4CAF50"
                      }}>
                        {e.priority} priority
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1"><Flag className="w-3 h-3" /> {e.country}</span>
                      <span className="capitalize">{e.type}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{e.description}</p>
                  </div>
                  <button onClick={() => deleteCalEvent(e.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors shrink-0">
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── ALERTS TAB ── */}
      {tab === "alerts" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Smart Alert Management</h3>
              <p className="text-sm text-muted-foreground">Configure intelligent trade alerts and watchlist</p>
            </div>
            <Button size="sm" onClick={() => setAddAlertModal(true)} style={{ background: EMERALD, color: "white" }}>
              <Plus className="w-4 h-4 mr-1" /> Add Alert
            </Button>
          </div>
          <div className="grid gap-3">
            {alerts.map(a => (
              <Card key={a.id} className={`border-0 shadow-sm transition-all ${a.triggered ? "ring-1" : ""}`} style={{ ringColor: a.severity === "critical" ? "#F44336" : "#FF9800" }}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{
                    background: a.severity === "critical" ? "#F4433620" : a.severity === "high" ? "#FF980020" : "#4CAF5020"
                  }}>
                    <AlertTriangle className="w-5 h-5" style={{ color: a.severity === "critical" ? "#F44336" : a.severity === "high" ? "#FF9800" : "#4CAF50" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">{a.title}</span>
                      {a.triggered && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold animate-pulse">TRIGGERED</span>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{a.condition}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize" style={{
                        background: a.severity === "critical" ? "#F4433620" : a.severity === "high" ? "#FF980020" : "#FF980015",
                        color: a.severity === "critical" ? "#F44336" : a.severity === "high" ? "#FF9800" : "#FF9800"
                      }}>{a.severity}</span>
                      <span className="text-[10px] text-muted-foreground capitalize">{a.type}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleAlert(a.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                      style={{ background: a.active ? GREEN + "20" : "rgba(0,0,0,0.06)", color: a.active ? GREEN : "#9CA3AF" }}
                    >
                      {a.active ? "Active" : "Inactive"}
                    </button>
                    <button onClick={() => deleteAlert(a.id)} className="p-1.5 rounded hover:bg-red-50 transition-colors">
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── ANALYTICS TAB ── */}
      {tab === "analytics" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Total Articles", value: news.length, sub: "All time" },
              { label: "Approval Rate", value: `${Math.round((news.filter(n => n.status === "approved").length / Math.max(news.length, 1)) * 100)}%`, sub: "Published vs reviewed" },
              { label: "Avg Review Time", value: "0h", sub: "Per article" },
              { label: "User Engagement", value: "0", sub: "Monthly reads" },
            ].map(s => (
              <Card key={s.label} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold" style={{ color: EMERALD }}>{s.value}</div>
                  <div className="text-sm font-medium mt-0.5">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.sub}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Articles by Category</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(["commodity", "shipping", "currency", "weather", "regulation", "market", "risk", "ai"] as NewsCat[]).map(cat => {
                  const count = news.filter(n => n.category === cat).length
                  const pct = Math.round((count / Math.max(news.length, 1)) * 100)
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium capitalize">{cat}</span>
                        <span className="text-muted-foreground">{count} articles ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: CAT_COLOR[cat] }} />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm">Articles by Status</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {(["pending", "approved", "rejected", "scheduled", "archived"] as NewsStatus[]).map(status => {
                  const count = news.filter(n => n.status === status).length
                  const pct = Math.round((count / Math.max(news.length, 1)) * 100)
                  return (
                    <div key={status}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium capitalize">{status}</span>
                        <span className="text-muted-foreground">{count} articles</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: STATUS_COLOR[status] }} />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-sm">
            <CardHeader><CardTitle className="text-sm">System Status</CardTitle></CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { name: "Reuters API Feed", status: "operational", latency: "142ms" },
                  { name: "Bloomberg Data Stream", status: "operational", latency: "89ms" },
                  { name: "Pakistan Met Dept API", status: "operational", latency: "210ms" },
                  { name: "IMF Data API", status: "operational", latency: "315ms" },
                  { name: "AI Analysis Engine", status: "operational", latency: "1.2s" },
                  { name: "RSS Feed Aggregator", status: "degraded", latency: "2.4s" },
                ].map(s => (
                  <div key={s.name} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: s.status === "operational" ? GREEN : "#FF9800" }} />
                      <span className="text-sm font-medium">{s.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">{s.latency}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── CONFIG TAB ── */}
      {tab === "config" && (
        <div className="space-y-6">

          {/* Auto-Approve Banner */}
          <Card className="border-2" style={{
            borderColor: "#FF980050",
            background: "#FF980008",
          }}>
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "#FF980020" }}>
                  <Zap className="w-5 h-5" style={{ color: "#FF9800" }} />
                </div>
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    Google News Import Mode
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold text-white"
                      style={{ background: "#FF9800" }}>
                      REVIEW
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 max-w-md">
                    Imports land in the Pending queue for approval. Set <code>GOOGLE_NEWS_AUTO_PUBLISH=true</code> on the API server to auto-publish.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Rss className="w-4 h-4" style={{ color: "#FF9800" }} /> RSS Feed Sources</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Reuters Trade News", url: "https://feeds.reuters.com/reuters/businessNews", active: true },
                  { name: "Bloomberg Markets", url: "https://feeds.bloomberg.com/markets/news", active: true },
                  { name: "Dawn Business Pakistan", url: "https://www.dawn.com/feeds/business", active: true },
                  { name: "Lloyd's List Shipping", url: "https://lloydslist.maritimeintelligence.informa.com/rss", active: false },
                  { name: "USDA Market Reports", url: "https://www.usda.gov/rss/", active: true },
                ].map((feed, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }}>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: feed.active ? GREEN : "#9CA3AF" }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{feed.name}</div>
                      <div className="text-xs text-muted-foreground truncate">{feed.url}</div>
                    </div>
                    <span className="text-xs font-medium" style={{ color: feed.active ? GREEN : "#9CA3AF" }}>{feed.active ? "Active" : "Off"}</span>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2"><Plus className="w-3.5 h-3.5 mr-1" /> Add RSS Feed</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Database className="w-4 h-4" style={{ color: "#9C27B0" }} /> API Configuration</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { name: "Commodity Price API", key: "••••••••••••••••3fa2", status: "connected" },
                  { name: "Currency Exchange API", key: "••••••••••••••••7b91", status: "connected" },
                  { name: "Weather Data API", key: "••••••••••••••••2c4d", status: "connected" },
                  { name: "Shipping Rates API", key: "••••••••••••••••9e12", status: "expired" },
                ].map((api, i) => (
                  <div key={i} className="p-3 rounded-lg space-y-1" style={{ background: "rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{api.name}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: api.status === "connected" ? "#4CAF5020" : "#F4433620", color: api.status === "connected" ? GREEN : "#F44336" }}>
                        {api.status}
                      </span>
                    </div>
                    <div className="font-mono text-xs text-muted-foreground">{api.key}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Tag className="w-4 h-4" style={{ color: GREEN }} /> Category Management</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {["commodity", "shipping", "currency", "weather", "regulation", "market", "risk", "ai"].map(cat => (
                  <div key={cat} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }}>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ background: CAT_COLOR[cat as NewsCat] }} />
                      <span className="text-sm font-medium capitalize">{cat}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{news.filter(n => n.category === cat).length} articles</span>
                  </div>
                ))}
                <Button variant="outline" size="sm" className="w-full mt-2"><Plus className="w-3.5 h-3.5 mr-1" /> Add Category</Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="w-4 h-4" style={{ color: "#2196F3" }} /> Notification Management</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: "Email digest — Investors (daily)", enabled: true },
                  { label: "Push notifications — High priority news", enabled: true },
                  { label: "SMS alerts — Critical trade events", enabled: false },
                  { label: "WhatsApp broadcast — Market summaries", enabled: true },
                  { label: "Buyer portal news feed updates", enabled: true },
                ].map((notif, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg" style={{ background: "rgba(0,0,0,0.04)" }}>
                    <span className="text-sm">{notif.label}</span>
                    <div className="w-8 h-4 rounded-full relative cursor-pointer" style={{ background: notif.enabled ? GREEN : "#D1D5DB" }}>
                      <div className="w-3 h-3 rounded-full bg-white absolute top-0.5 transition-all" style={{ left: notif.enabled ? "17px" : "2px" }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* View News Modal */}
      {viewNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b flex items-start justify-between" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: CAT_COLOR[viewNews.category] + "20", color: CAT_COLOR[viewNews.category] }}>{viewNews.category}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: STATUS_COLOR[viewNews.status] + "20", color: STATUS_COLOR[viewNews.status] }}>{viewNews.status}</span>
                </div>
                <h3 className="font-bold text-lg leading-tight">{viewNews.title}</h3>
                <div className="text-xs text-muted-foreground mt-1">{viewNews.source} · {new Date(viewNews.publishedAt).toLocaleDateString()}</div>
              </div>
              <button onClick={() => setViewNews(null)} className="p-2 rounded-lg hover:bg-muted ml-4 shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm leading-relaxed text-muted-foreground">{viewNews.summary}</p>
              {viewNews.ogCommentary && (
                <div className="p-4 rounded-xl" style={{ background: GOLD + "15", borderLeft: `4px solid ${GOLD}` }}>
                  <div className="text-xs font-bold mb-1" style={{ color: GOLD }}>OG EXPORTS COMMENTARY</div>
                  <p className="text-sm leading-relaxed">{viewNews.ogCommentary}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-2 pt-2">
                {viewNews.tags.map(tag => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-muted font-medium">#{tag}</span>
                ))}
              </div>
              {viewNews.status === "pending" && (
                <div className="flex gap-2 pt-4 border-t" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
                  <Button size="sm" onClick={() => { updateNewsStatus(viewNews.id, "approved"); setViewNews(null) }} style={{ background: GREEN, color: "white" }}>
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setScheduleModal(viewNews); setViewNews(null) }}>
                    <Clock className="w-4 h-4 mr-1" /> Schedule
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setEditNews({ ...viewNews }); setViewNews(null) }}>
                    <Edit3 className="w-4 h-4 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => { updateNewsStatus(viewNews.id, "rejected"); setViewNews(null) }}>
                    <XCircle className="w-4 h-4 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit News Modal */}
      {editNews && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <h3 className="font-bold text-lg">Edit Article</h3>
              <button onClick={() => setEditNews(null)} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={editNews.title} onChange={e => setEditNews({ ...editNews, title: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Summary</Label>
                <textarea className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" value={editNews.summary} onChange={e => setEditNews({ ...editNews, summary: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={editNews.category} onChange={e => setEditNews({ ...editNews, category: e.target.value as NewsCat })}>
                    {["commodity", "shipping", "currency", "weather", "regulation", "market", "risk", "ai"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={editNews.priority} onChange={e => setEditNews({ ...editNews, priority: e.target.value as "high" | "medium" | "low" })}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>OG Exports Commentary</Label>
                <textarea className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" placeholder="Add your expert commentary..." value={editNews.ogCommentary} onChange={e => setEditNews({ ...editNews, ogCommentary: e.target.value })} />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => saveEditNews(editNews)} style={{ background: EMERALD, color: "white" }}>
                  <Save className="w-4 h-4 mr-1" /> Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditNews(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {scheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <h3 className="font-bold">Schedule Publication</h3>
              <button onClick={() => setScheduleModal(null)} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground">Article: <span className="font-semibold text-foreground">{scheduleModal.title.slice(0, 50)}...</span></p>
              <div className="space-y-1.5">
                <Label>Publication Date & Time</Label>
                <Input type="datetime-local" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSchedule} disabled={!scheduleDate} style={{ background: "#2196F3", color: "white" }}>
                  <Clock className="w-4 h-4 mr-1" /> Schedule
                </Button>
                <Button variant="outline" onClick={() => setScheduleModal(null)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Calendar Event Modal */}
      {addCalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <h3 className="font-bold">Add Trade Event</h3>
              <button onClick={() => setAddCalModal(false)} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5"><Label>Event Title</Label><Input placeholder="Event name" value={newEvent.title || ""} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={newEvent.date || ""} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })} /></div>
                <div className="space-y-1.5">
                  <Label>Country</Label><Input placeholder="Country" value={newEvent.country || ""} onChange={e => setNewEvent({ ...newEvent, country: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={newEvent.type || "market"} onChange={e => setNewEvent({ ...newEvent, type: e.target.value })}>
                    {["market", "regulatory", "inspection", "shipment", "meeting", "deadline"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={newEvent.priority || "medium"} onChange={e => setNewEvent({ ...newEvent, priority: e.target.value as "high" | "medium" | "low" })}>
                    <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5"><Label>Description</Label><textarea className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" value={newEvent.description || ""} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button onClick={addCalEvent} disabled={!newEvent.title || !newEvent.date} style={{ background: EMERALD, color: "white" }}><Plus className="w-4 h-4 mr-1" /> Add Event</Button>
                <Button variant="outline" onClick={() => setAddCalModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Alert Modal */}
      {addAlertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <h3 className="font-bold">Add Smart Alert</h3>
              <button onClick={() => setAddAlertModal(false)} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5"><Label>Alert Title</Label><Input placeholder="Alert name" value={newAlert.title || ""} onChange={e => setNewAlert({ ...newAlert, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Condition</Label><Input placeholder="e.g. Basmati price drops >5%" value={newAlert.condition || ""} onChange={e => setNewAlert({ ...newAlert, condition: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={newAlert.type || "price"} onChange={e => setNewAlert({ ...newAlert, type: e.target.value })}>
                    {["price", "currency", "weather", "shipping", "regulation"].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Severity</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={newAlert.severity || "medium"} onChange={e => setNewAlert({ ...newAlert, severity: e.target.value as "critical" | "high" | "medium" | "low" })}>
                    <option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={addAlertItem} disabled={!newAlert.title || !newAlert.condition} style={{ background: EMERALD, color: "white" }}><Plus className="w-4 h-4 mr-1" /> Add Alert</Button>
                <Button variant="outline" onClick={() => setAddAlertModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add News Modal */}
      {addNewsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: "rgba(0,0,0,0.08)" }}>
              <h3 className="font-bold">Add News Article</h3>
              <button onClick={() => setAddNewsModal(false)} className="p-2 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5"><Label>Title <span className="text-red-400">*</span></Label><Input value={newNewsForm.title || ""} onChange={e => setNewNewsForm({ ...newNewsForm, title: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Source</Label><Input placeholder="Reuters, Bloomberg..." value={newNewsForm.source || ""} onChange={e => setNewNewsForm({ ...newNewsForm, source: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <select className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm" value={newNewsForm.category || "market"} onChange={e => setNewNewsForm({ ...newNewsForm, category: e.target.value as NewsCat })}>
                    {["commodity", "shipping", "currency", "weather", "regulation", "market", "risk", "ai"].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5"><Label>Region</Label><Input placeholder="Global, Pakistan, EU..." value={newNewsForm.region || ""} onChange={e => setNewNewsForm({ ...newNewsForm, region: e.target.value })} /></div>
              </div>
              <div className="space-y-1.5"><Label>Summary <span className="text-red-400">*</span></Label><textarea className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm resize-none" value={newNewsForm.summary || ""} onChange={e => setNewNewsForm({ ...newNewsForm, summary: e.target.value })} /></div>
              <div className="flex gap-2">
                <Button onClick={addNewsItem} disabled={!newNewsForm.title || !newNewsForm.summary} style={{ background: EMERALD, color: "white" }}><Plus className="w-4 h-4 mr-1" /> Add to Queue</Button>
                <Button variant="outline" onClick={() => setAddNewsModal(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
