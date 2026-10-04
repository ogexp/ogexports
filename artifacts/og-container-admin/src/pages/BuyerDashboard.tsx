import { useMemo, useState, useRef, type ElementType } from "react"
import { useQuery } from "@tanstack/react-query"
import { notify } from "@/lib/notify"
import { Link } from "wouter"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts"
import {
  ShoppingCart, Ship, FileText, ClipboardList,
  DollarSign, CheckCircle2, Clock, ArrowUpRight, ArrowDownRight,
  Star, Bell, Calendar, Package, Building2,
  MapPin, Shield, Award, Truck, Search, Loader2
} from "lucide-react"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { useLocalAuth } from "@/lib/local-auth"
import { useCurrency } from "@/lib/use-currency"
import { api, resolveMediaUrl, uploadProfileAvatar } from "@/lib/api"
import { kycDashboardBadge } from "@/lib/kyc-badge"
import { RecentAlertsCard } from "@/components/portal/RecentAlertsCard"

type SpendPoint = { month: string; value: number }
type StatusSlice = { name: string; value: number; color: string }
type UpcomingShipment = {
  ref: string
  product: string
  qty: string
  origin: string
  destination: string
  eta: string
  etd: string
  vessel: string
  status: string
  pct: number
}
type ActivityItem = { type: string; title: string; desc: string; time: string; at?: string }
type AlertItem = { type: string; title: string; badge: string }
type FavouriteItem = { name: string; grade: string; origin: string; icon: string }
type ChecklistItem = { label: string; done: boolean }

type DashboardData = {
  kpis?: {
    orders?: number
    orders_change?: string
    orders_trend?: string
    orders_trend_up?: boolean
    spend_total?: number
    spend_change?: string
    spend_trend?: string
    spend_trend_up?: boolean
    shipments_active?: number
    shipments_change?: string
    shipments_trend?: string
    shipments_trend_up?: boolean
    rfqs_pending?: number
    rfqs_change?: string
    rfqs_trend?: string
    rfqs_trend_up?: boolean
  }
  spend_by_month?: SpendPoint[]
  spend_yoy_pct?: number
  orders_by_status?: StatusSlice[]
  upcoming_shipments?: UpcomingShipment[]
  recent_activity?: ActivityItem[]
  alerts?: AlertItem[]
  favourites?: FavouriteItem[]
  trust_score?: number
  trust_tier?: string
  member_since?: string | null
  kyc_status?: string | null
  profile_completion?: number
  profile_checklist?: ChecklistItem[]
}

const QUICK_ACTIONS_TOP = [
  { label: "New RFQ",       icon: ClipboardList, href: "/buyer/rfq",        color: "text-amber-600",   bg: "bg-amber-500/10",   border: "border-amber-500/20"   },
  { label: "Track Shipment",icon: Ship,          href: "/buyer/shipments",  color: "text-blue-600",    bg: "bg-blue-500/10",    border: "border-blue-500/20"    },
  { label: "View Documents",icon: FileText,      color: "text-violet-600",  bg: "bg-violet-500/10",    border: "border-violet-500/20",  href: "/buyer/documents" },
  { label: "Request Quote", icon: Search,        href: "/buyer/catalogue",  color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
]

const QUICK_ACTIONS = [
  { label: "New RFQ",         icon: ClipboardList, href: "/buyer/rfq/new",    color: "#D4A012", textColor: "#1F2933" },
  { label: "Track Shipment",  icon: Ship,          href: "/buyer/shipments",  color: "#0F3D2E", textColor: "#fff"    },
  { label: "View Documents",  icon: FileText,      href: "/buyer/documents",  color: "#1F2933", textColor: "#fff"    },
  { label: "Pay Invoice",     icon: DollarSign,    href: "/buyer/payments",   color: "#4CAF50", textColor: "#fff"    },
]

const EMPTY_STATUS: StatusSlice[] = [
  { name: "Pending",       value: 0, color: "#f59e0b" },
  { name: "Confirmed",     value: 0, color: "#3b82f6" },
  { name: "In Production", value: 0, color: "#8b5cf6" },
  { name: "Shipped",       value: 0, color: "#0ea5e9" },
  { name: "Delivered",     value: 0, color: "#16a34a" },
]

const ACTIVITY_META: Record<string, { icon: ElementType; color: string; bg: string }> = {
  rfq:                 { icon: ClipboardList, color: "text-amber-500",   bg: "bg-amber-500/15"   },
  quotation:           { icon: FileText,      color: "text-blue-500",    bg: "bg-blue-500/15"    },
  quotation_accepted:  { icon: Package,       color: "text-blue-500",    bg: "bg-blue-500/15"    },
  order:               { icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-500/15" },
  order_delivered:     { icon: CheckCircle2,  color: "text-emerald-500", bg: "bg-emerald-500/15" },
  shipment:            { icon: Ship,          color: "text-accent",      bg: "bg-accent/15"      },
  document:            { icon: FileText,      color: "text-primary",     bg: "bg-primary/15"     },
  payment:             { icon: DollarSign,    color: "text-emerald-500", bg: "bg-emerald-500/15" },
}

const ALERT_META: Record<string, {
  icon: ElementType
  color: string
  bg: string
  border: string
  badgeColor: string
}> = {
  shipment:  { icon: Truck,         color: "text-emerald-600", bg: "bg-emerald-500/10", border: "border-emerald-500/25", badgeColor: "bg-emerald-500/15 text-emerald-700" },
  rfq:       { icon: ClipboardList, color: "text-amber-600",   bg: "bg-amber-500/10",   border: "border-amber-500/25",   badgeColor: "bg-amber-500/15 text-amber-700" },
  quotation: { icon: Bell,          color: "text-blue-600",    bg: "bg-blue-500/10",    border: "border-blue-500/25",    badgeColor: "bg-blue-500/15 text-blue-700" },
  order:     { icon: ShoppingCart,  color: "text-blue-600",    bg: "bg-blue-500/10",    border: "border-blue-500/25",    badgeColor: "bg-blue-500/15 text-blue-700" },
}

function formatYoyBadge(pct?: number): string {
  if (pct === undefined || pct === null || Number.isNaN(pct)) return "0% YoY"
  const sign = pct > 0 ? "+" : ""
  return `${sign}${pct}% YoY`
}

function trustSubScores(score: number): { label: string; score: string }[] {
  const letter = (n: number) => {
    if (n >= 90) return "A+"
    if (n >= 80) return "A"
    if (n >= 70) return "B+"
    if (n >= 60) return "B"
    if (n >= 50) return "C"
    return "D"
  }
  const base = Math.min(100, Math.max(0, Math.round(score / 10)))
  return [
    { label: "Payment",  score: letter(Math.min(100, base + 5)) },
    { label: "Delivery", score: letter(base) },
    { label: "Volume",   score: letter(Math.max(0, base - 8)) },
  ]
}

const CUSTOM_PIE_LABEL = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  return percent > 0.08 ? (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {Math.round(percent * 100)}%
    </text>
  ) : null
}

export default function BuyerDashboard() {
  const { displayName, avatarUrl } = useSafeAuth()
  const { refreshUser } = useLocalAuth()
  const c = useCurrency()
  const formatSpend = (value: number) => c.fmt(Number(value) || 0)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const buyerAvatar = resolveMediaUrl(avatarUrl)

  const { data: payload, isLoading, isError } = useQuery({
    queryKey: ["buyer", "dashboard"],
    queryFn: () => api.get<{ data: DashboardData }>("/api/buyer/dashboard"),
  })

  const data = payload?.data

  const kpiCards = useMemo(() => {
    const k = data?.kpis
    return [
      {
        label: "Total Orders",
        value: String(k?.orders ?? 0),
        change: k?.orders_change ?? "0 this quarter",
        trend: k?.orders_trend ?? "0%",
        up: k?.orders_trend_up ?? true,
        icon: ShoppingCart,
        color: "text-blue-500",
        bg: "bg-blue-500/15",
      },
      {
        label: "Total Purchase Value",
        value: formatSpend(Number(k?.spend_total ?? 0)),
        change: k?.spend_change ?? "0% YoY",
        trend: k?.spend_trend ?? "0%",
        up: k?.spend_trend_up ?? true,
        icon: DollarSign,
        color: "text-emerald-500",
        bg: "bg-emerald-500/15",
      },
      {
        label: "Active Shipments",
        value: String(k?.shipments_active ?? 0),
        change: k?.shipments_change ?? "No active shipments",
        trend: k?.shipments_trend ?? "+0",
        up: k?.shipments_trend_up ?? true,
        icon: Ship,
        color: "text-accent",
        bg: "bg-accent/15",
      },
      {
        label: "Pending RFQs",
        value: String(k?.rfqs_pending ?? 0),
        change: k?.rfqs_change ?? "No pending RFQs",
        trend: k?.rfqs_trend ?? "+0",
        up: k?.rfqs_trend_up ?? true,
        icon: ClipboardList,
        color: "text-amber-500",
        bg: "bg-amber-500/15",
      },
    ]
  }, [data?.kpis])

  const monthlySpend = data?.spend_by_month?.length
    ? data.spend_by_month
    : Array.from({ length: 12 }, (_, i) => {
        const d = new Date()
        d.setMonth(d.getMonth() - (11 - i))
        return { month: d.toLocaleString("en-US", { month: "short" }), value: 0 }
      })

  const orderStatusData = data?.orders_by_status?.length ? data.orders_by_status : EMPTY_STATUS
  const upcomingShipments = data?.upcoming_shipments ?? []
  const activity = data?.recent_activity ?? []
  const alerts = data?.alerts ?? []
  const favourites = data?.favourites ?? []
  const profileCompletion = data?.profile_completion ?? 0
  const profileChecklist = data?.profile_checklist ?? [
    { label: "Company Registration", done: false },
    { label: "Import License", done: false },
    { label: "Tax Registration", done: false },
    { label: "KYC Documents", done: false },
    { label: "Banking Details", done: false },
  ]
  const trustScore = Number(data?.trust_score ?? 0)
  const trustTier = data?.trust_tier || "Verified"
  const memberSince = data?.member_since || null
  const kycBadge = kycDashboardBadge(data?.kyc_status)
  const spendYoyBadge = formatYoyBadge(data?.spend_yoy_pct)
  const nextTier = trustScore >= 900 ? "Max tier" : trustScore >= 700 ? "Platinum at 900" : trustScore >= 500 ? "Gold at 700" : "Silver at 500"
  const trustPct = Math.min(100, Math.round(trustScore / 10))

  async function handleAvatarFile(file?: File) {
    if (!file) return
    setUploadingAvatar(true)
    try {
      await uploadProfileAvatar(file)
      await refreshUser()
      notify.success("Profile photo updated")
    } catch (e: any) {
      notify.error(e?.message || "Unable to upload profile photo")
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <BuyerPortalLayout title="Executive Dashboard" subtitle="Welcome back — your trade activity at a glance">
      <div className="space-y-7">

        {isLoading && (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading live dashboard data…
          </div>
        )}

        {isError && !isLoading && (
          <div className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            Unable to load dashboard data. Please refresh and try again.
          </div>
        )}

        {/* Welcome banner */}
        <div className="relative overflow-hidden rounded-2xl p-6 text-white" style={{ background: "linear-gradient(135deg, #0F3D2E 0%, #1a5c44 60%, #0F3D2E 100%)" }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 70% 50%, #D4A012 0%, transparent 60%)" }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {/* Profile photo avatar */}
              <div className="relative shrink-0 group cursor-pointer" onClick={() => !uploadingAvatar && avatarInputRef.current?.click()}>
                <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center text-xl font-bold">
                  {uploadingAvatar ? (
                    <Loader2 className="w-6 h-6 animate-spin text-white/90" />
                  ) : buyerAvatar ? (
                    <img src={buyerAvatar} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    displayName?.[0]?.toUpperCase() ?? "B"
                  )}
                </div>
                <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                </div>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleAvatarFile(e.target.files?.[0])} />
              </div>
            <div>
              <p className="text-sm text-white/60 font-medium mb-1">Good day,</p>
              <h2 className="text-2xl font-heading font-bold">{displayName ?? "Valued Buyer"}</h2>
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${kycBadge.className}`}>
                  {kycBadge.label}
                </span>
                <Badge className="bg-white/15 text-white border-0 text-xs flex items-center gap-1.5">
                  <Award className="w-3 h-3" style={{ color: "#D4A012" }} />
                  <span style={{ color: "#D4A012" }}>{trustTier}</span> Verified Buyer
                </Badge>
                {memberSince && (
                  <span className="text-white/60 text-xs">Member since {memberSince}</span>
                )}
              </div>
            </div>
            </div>{/* end avatar+text row */}
            <div className="flex gap-3 shrink-0">
              {QUICK_ACTIONS.map(a => (
                <Link key={a.label} href={a.href}>
                  <button className="flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl text-xs font-semibold transition-all hover:scale-105" style={{ background: a.color, color: a.textColor }}>
                    <a.icon className="w-5 h-5" />
                    <span className="hidden sm:block">{a.label}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Row — 4 large icon+label cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS_TOP.map(a => (
            <Link key={a.label} href={a.href}>
              <div className={`flex flex-col items-center gap-3 p-5 rounded-2xl border cursor-pointer hover:scale-[1.02] transition-all duration-200 ${a.bg} ${a.border}`}>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${a.bg}`}>
                  <a.icon className={`w-6 h-6 ${a.color}`} />
                </div>
                <span className={`text-sm font-semibold ${a.color}`}>{a.label}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Market Alerts Strip */}
        <div className="grid md:grid-cols-3 gap-4">
          {alerts.length === 0 && !isLoading && (
            <div className="md:col-span-3 flex items-start gap-3 p-4 rounded-xl border bg-muted/30 border-border">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/50 dark:bg-black/10">
                <Bell className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <Badge className="text-[10px] font-semibold border-0 mb-1 bg-muted text-muted-foreground">Updates</Badge>
                <p className="text-xs font-semibold text-muted-foreground">No active alerts — your account is up to date.</p>
              </div>
            </div>
          )}
          {alerts.map((alert, i) => {
            const meta = ALERT_META[alert.type] || ALERT_META.order
            const Icon = meta.icon
            return (
              <div key={i} className={`flex items-start gap-3 p-4 rounded-xl border ${meta.bg} ${meta.border}`}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-white/50 dark:bg-black/10`}>
                  <Icon className={`w-4 h-4 ${meta.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <Badge className={`text-[10px] font-semibold border-0 mb-1 ${meta.badgeColor}`}>{alert.badge}</Badge>
                  <p className={`text-xs font-semibold ${meta.color}`}>{alert.title}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map(k => (
            <Card key={k.label} className="glass-card hover:border-accent/30 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-9 h-9 rounded-xl ${k.bg} flex items-center justify-center`}>
                    <k.icon className={`w-4 h-4 ${k.color}`} />
                  </div>
                  <span className={`text-xs font-semibold flex items-center gap-0.5 ${k.up ? "text-emerald-500" : "text-red-400"}`}>
                    {k.up
                      ? <ArrowUpRight className="w-3 h-3" />
                      : <ArrowDownRight className="w-3 h-3" />}
                    {k.trend}
                  </span>
                </div>
                <p className="text-2xl font-heading font-bold">{k.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{k.label}</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">{k.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Spend trend + upcoming deliveries */}
          <div className="lg:col-span-2 space-y-5">
            {/* Charts row — Spend + Orders Donut */}
            <div className="grid md:grid-cols-2 gap-5">
              {/* Spend chart */}
              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="font-heading text-base">Monthly Purchase Value</CardTitle>
                    <p className="text-xs text-muted-foreground">12-month trend (USD)</p>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">{spendYoyBadge}</Badge>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={monthlySpend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0F3D2E" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0F3D2E" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => formatSpend(Number(v))} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [formatSpend(v), "Spend"]} />
                      <Area type="monotone" dataKey="value" stroke="#0F3D2E" strokeWidth={2} fill="url(#spendGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Orders by Status donut */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-base">Orders by Status</CardTitle>
                  <p className="text-xs text-muted-foreground">Current order distribution</p>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <ResponsiveContainer width={130} height={130}>
                      <PieChart>
                        <Pie
                          data={orderStatusData}
                          cx="50%" cy="50%"
                          innerRadius={35} outerRadius={60}
                          paddingAngle={2}
                          dataKey="value"
                          labelLine={false}
                          label={CUSTOM_PIE_LABEL}
                        >
                          {orderStatusData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                          formatter={(v: number, name: string) => [v, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {orderStatusData.map(d => (
                        <div key={d.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                            <span className="text-muted-foreground truncate">{d.name}</span>
                          </div>
                          <span className="font-bold ml-2">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Upcoming shipments */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="font-heading text-base flex items-center gap-2">
                  <Ship className="w-4 h-4 text-accent" /> Upcoming Deliveries
                </CardTitle>
                <Link href="/buyer/shipments"><Button size="sm" variant="outline">View All</Button></Link>
              </CardHeader>
              <CardContent className="space-y-4">
                {upcomingShipments.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2">No shipments yet.</p>
                )}
                {upcomingShipments.map(s => (
                  <div key={s.ref} className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{s.product}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />{s.origin} → {s.destination} · ETA {s.eta}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge className={`text-[10px] border-0 ${
                          s.status === "In Transit" ? "bg-blue-500/15 text-blue-600" :
                          s.status === "Loading"    ? "bg-amber-500/15 text-amber-600" :
                          "bg-muted text-muted-foreground"
                        }`}>{s.status}</Badge>
                        <p className="text-[10px] text-muted-foreground mt-1">{s.ref}</p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all" style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Upcoming Deliveries — compact cards */}
            <div className="grid sm:grid-cols-3 gap-4">
              {upcomingShipments.length === 0 && !isLoading && (
                <Card className="glass-card sm:col-span-3">
                  <CardContent className="p-4 text-sm text-muted-foreground">
                    No upcoming deliveries to show.
                  </CardContent>
                </Card>
              )}
              {upcomingShipments.map((d, i) => (
                <Card key={i} className="glass-card hover:border-accent/30 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-emerald-500 shrink-0" />
                      <p className="text-sm font-semibold truncate">{d.product}</p>
                    </div>
                    <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground">{d.qty}</span></p>
                    <p className="text-xs text-muted-foreground mt-1">ETD: <span className="font-medium text-accent">{d.etd}</span></p>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Ship className="w-3 h-3" />{d.vessel}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            <RecentAlertsCard
              apiBase="/api/notifications"
              listHref="/buyer/notifications"
              limit={5}
            />
            {/* Profile completion */}
            <Card className="glass-card">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">Profile Completion</p>
                    <p className="text-xs text-muted-foreground">Company verification</p>
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-bold text-accent">{profileCompletion}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-accent rounded-full" style={{ width: `${profileCompletion}%` }} />
                  </div>
                </div>
                {profileChecklist.map(item => (
                  <div key={item.label} className="flex items-center gap-2 py-1.5">
                    {item.done ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                    <span className={`text-xs ${item.done ? "text-foreground" : "text-muted-foreground"}`}>{item.label}</span>
                  </div>
                ))}
                <Link href="/buyer/company">
                  <Button size="sm" className="w-full mt-3">Complete Profile →</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Trust Score */}
            <Card className="glass-card border-accent/20">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-accent" />
                    <span className="text-sm font-bold">Trust Score</span>
                  </div>
                  <Badge className="bg-accent/15 text-amber-700 border-0 text-xs">
                    <Award className="w-3 h-3 mr-1" /> {trustTier}
                  </Badge>
                </div>
                <div className="flex items-end gap-2 mb-3">
                  <p className="text-3xl font-heading font-bold">{trustScore}</p>
                  <p className="text-xs text-muted-foreground mb-1">/ 1000</p>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${trustPct}%`, background: "linear-gradient(90deg, #D4A012, #E8C048)" }} />
                </div>
                <p className="text-xs text-muted-foreground">Next tier: <strong className="text-accent">{nextTier}</strong></p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {trustSubScores(trustScore).map(s => (
                    <div key={s.label} className="p-2 rounded-lg bg-muted/40 text-center">
                      <p className="text-sm font-bold">{s.score}</p>
                      <p className="text-[10px] text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Saved Products */}
            <Card className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="font-heading text-sm flex items-center gap-2">
                  <Star className="w-4 h-4 text-accent" /> Favourites
                </CardTitle>
                <Link href="/buyer/catalogue"><span className="text-xs text-accent hover:underline cursor-pointer">View all</span></Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {favourites.length === 0 && (
                    <p className="px-5 py-4 text-xs text-muted-foreground">No favourites yet — submit an RFQ to get started.</p>
                  )}
                  {favourites.map(p => (
                    <div key={p.name} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
                      <span className="text-xl">{p.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{p.name}</p>
                        <p className="text-[10px] text-muted-foreground">{p.grade} · {p.origin}</p>
                      </div>
                      <Link href="/buyer/rfq/new">
                        <button className="text-[10px] text-accent hover:underline font-semibold shrink-0">RFQ</button>
                      </Link>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Trade Activity Timeline */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="font-heading text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-accent" /> Trade Activity Timeline
            </CardTitle>
            <Link href="/buyer/orders"><Button size="sm" variant="outline">View Orders</Button></Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative px-5 py-2">
              {/* Vertical line */}
              {activity.length > 0 && (
                <div className="absolute left-[38px] top-4 bottom-4 w-px bg-border" />
              )}
              <div className="space-y-0">
                {activity.length === 0 && (
                  <p className="py-6 text-sm text-muted-foreground">No recent trade activity.</p>
                )}
                {activity.map((a, i) => {
                  const meta = ACTIVITY_META[a.type] || ACTIVITY_META.order
                  const Icon = meta.icon
                  return (
                    <div key={i} className="flex items-start gap-4 py-3.5 hover:bg-muted/20 transition-colors rounded-lg px-1 relative">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${meta.bg} z-10`}>
                        <Icon className={`w-4 h-4 ${meta.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{a.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{a.desc}</p>
                      </div>
                      <p className="text-xs text-muted-foreground shrink-0 pt-0.5">{a.time}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </BuyerPortalLayout>
  )
}
