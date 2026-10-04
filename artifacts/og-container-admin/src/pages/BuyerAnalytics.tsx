import { useEffect, useRef, useState } from "react"
import { BuyerPortalLayout } from "@/components/buyer/BuyerPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import { TrendingUp, ShoppingCart, DollarSign, Ship, Package, BarChart3, ArrowUpRight, ArrowDownRight } from "lucide-react"

// ─── Data ─────────────────────────────────────────────────────────────────────

const MONTHLY_SPEND = [
  { month: "Aug '25", value: 48000  },
  { month: "Sep '25", value: 62000  },
  { month: "Oct '25", value: 55000  },
  { month: "Nov '25", value: 78000  },
  { month: "Dec '25", value: 91000  },
  { month: "Jan '26", value: 64000  },
  { month: "Feb '26", value: 82000  },
  { month: "Mar '26", value: 95000  },
  { month: "Apr '26", value: 71000  },
  { month: "May '26", value: 88000  },
  { month: "Jun '26", value: 102000 },
  { month: "Jul '26", value: 116000 },
]

const COMMODITY_SPEND = [
  { name: "Basmati Rice", value: 52000, color: "#0F3D2E" },
  { name: "Sesame Seeds", value: 29600, color: "#4CAF50" },
  { name: "Red Chilli",   value: 12400, color: "#D4A012" },
  { name: "Chickpeas",    value: 15200, color: "#1a5a40" },
  { name: "Yellow Corn",  value: 7890,  color: "#6b7280" },
]

const COMMODITY_TOTAL = COMMODITY_SPEND.reduce((s, c) => s + c.value, 0)

const SHIPMENT_PERF = [
  { month: "Mar '26", onTime: 2, late: 0 },
  { month: "Apr '26", onTime: 1, late: 1 },
  { month: "May '26", onTime: 3, late: 0 },
  { month: "Jun '26", onTime: 2, late: 0 },
  { month: "Jul '26", onTime: 1, late: 0 },
]

// Top 10 destination countries with full data
const DEST_COUNTRIES = [
  { rank: 1, flag: "🇦🇪", country: "UAE",          shipments: 8,  value: 142000, trend: "up" },
  { rank: 2, flag: "🇸🇦", country: "Saudi Arabia", shipments: 5,  value: 74000,  trend: "up" },
  { rank: 3, flag: "🇳🇱", country: "Netherlands",  shipments: 4,  value: 62000,  trend: "up" },
  { rank: 4, flag: "🇱🇰", country: "Sri Lanka",    shipments: 3,  value: 45000,  trend: "stable" },
  { rank: 5, flag: "🇨🇳", country: "China",        shipments: 2,  value: 38000,  trend: "up" },
  { rank: 6, flag: "🇬🇧", country: "UK",           shipments: 2,  value: 29000,  trend: "up" },
  { rank: 7, flag: "🇩🇪", country: "Germany",      shipments: 1,  value: 21000,  trend: "up" },
  { rank: 8, flag: "🇲🇾", country: "Malaysia",     shipments: 1,  value: 18000,  trend: "stable" },
  { rank: 9, flag: "🇰🇪", country: "Kenya",        shipments: 1,  value: 14000,  trend: "up" },
  { rank: 10, flag: "🇪🇬", country: "Egypt",       shipments: 1,  value: 11000,  trend: "up" },
]

const DEST_TOTAL = DEST_COUNTRIES.reduce((s, c) => s + c.value, 0)

const KPI = [
  { label: "Total Orders",       value: "24",     change: "+3 QoQ",  up: true,  icon: ShoppingCart },
  { label: "Total Spend",        value: "$852K",  change: "+18% YoY", up: true, icon: DollarSign   },
  { label: "Avg. Order Value",   value: "$35.5K", change: "+8% YoY",  up: true, icon: TrendingUp   },
  { label: "Shipments On-Time",  value: "92%",    change: "+4% QoQ",  up: true, icon: Ship         },
  { label: "Avg. Lead Time",     value: "12 days",change: "-2 days",  up: true, icon: Package      },
  { label: "Active Commodities", value: "5",      change: "+1 this yr",up: true, icon: BarChart3    },
]


// ─── Business Statistics data ─────────────────────────────────────────────────
const BIZ_STATS = [
  { label: "Total Exports",        value: 47.2,   suffix: "M",   prefix: "$", decimals: 1 },
  { label: "Countries Reached",    value: 42,     suffix: "",    prefix: "",  decimals: 0 },
  { label: "Active Buyers",        value: 215,    suffix: "",    prefix: "",  decimals: 0 },
  { label: "Products Catalogued",  value: 32,     suffix: "",    prefix: "",  decimals: 0 },
  { label: "Shipments This Year",  value: 847,    suffix: "",    prefix: "",  decimals: 0 },
  { label: "Compliance Rate",      value: 99.8,   suffix: "%",   prefix: "",  decimals: 1 },
  { label: "Avg. Lead Time",       value: 18,     suffix: " days",prefix: "", decimals: 0 },
  { label: "Customer Satisfaction",value: 4.8,    suffix: "/5",  prefix: "",  decimals: 1 },
]

// ─── Count-up hook ────────────────────────────────────────────────────────────
function useCountUp(target: number, decimals: number, duration = 1800) {
  const [count, setCount] = useState(0)
  const started = useRef(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true
          const start = performance.now()
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(parseFloat((eased * target).toFixed(decimals)))
            if (progress < 1) requestAnimationFrame(step)
          }
          requestAnimationFrame(step)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [target, decimals, duration])

  return { ref, count }
}

// ─── Single stat counter card ─────────────────────────────────────────────────
function StatCounter({ stat }: { stat: typeof BIZ_STATS[0] }) {
  const { ref, count } = useCountUp(stat.value, stat.decimals)
  return (
    <div ref={ref} className="glass-card rounded-2xl p-5 text-center flex flex-col items-center gap-2">
      <div className="text-2xl font-heading font-bold text-foreground leading-none">
        {stat.prefix}{count.toFixed(stat.decimals)}{stat.suffix}
      </div>
      <div className="text-[11px] text-muted-foreground leading-tight">{stat.label}</div>
    </div>
  )
}


// ─── Custom PieChart label ────────────────────────────────────────────────────
function CenterLabel({ viewBox, total }: { viewBox?: { cx: number; cy: number }; total: number }) {
  if (!viewBox) return null
  const { cx, cy } = viewBox
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: "11px", fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}>
        Total
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="central"
        style={{ fontSize: "14px", fill: "hsl(var(--foreground))", fontWeight: 700 }}>
        ${(Number(total) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </text>
    </g>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BuyerAnalytics() {
  const [kpis, setKpis] = useState(KPI)
  const [monthlySpend, setMonthlySpend] = useState(MONTHLY_SPEND)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { api } = await import("@/lib/api")
        const res = await api.get<{ data: any }>("/api/buyer/analytics")
        const d = res?.data
        if (!d || cancelled) return
        const orders = Number(d.orders_total || 0)
        const spend = Number(d.spend_total || 0)
        const avg = orders > 0 ? spend / orders : 0
        setKpis([
          { label: "Total Orders", value: String(orders), change: "All time", up: true, icon: ShoppingCart },
          { label: "Total Spend", value: `$${spend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, change: "All time", up: true, icon: DollarSign },
          { label: "Avg. Order Value", value: `$${avg.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, change: "All time", up: true, icon: TrendingUp },
          { label: "RFQs Submitted", value: String(d.rfqs_total || 0), change: "All time", up: true, icon: Package },
          { label: "Quotes Accepted", value: String(d.quotations_accepted || 0), change: "All time", up: true, icon: Ship },
          { label: "Active Commodities", value: "—", change: "From orders", up: true, icon: BarChart3 },
        ])
        if (Array.isArray(d.spend_by_month) && d.spend_by_month.length) {
          setMonthlySpend(d.spend_by_month.map((m: any) => ({
            month: m.month || "",
            value: Number(m.total || m.value || 0),
          })))
        }
      } catch { /* keep mock fallbacks */ }
    })()
    return () => { cancelled = true }
  }, [])

  return (
    <BuyerPortalLayout title="Buyer Analytics" subtitle="Executive procurement intelligence — purchase trends, commodity breakdown and performance metrics">
      <div className="space-y-7">

        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {kpis.map(k => (
            <Card key={k.label} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <k.icon className="w-4 h-4 text-accent" />
                  <span className="text-[10px] text-emerald-500 flex items-center gap-0.5 font-medium">
                    <ArrowUpRight className="w-3 h-3" />{k.change}
                  </span>
                </div>
                <p className="text-xl font-heading font-bold leading-none">{k.value}</p>
                <p className="text-[10px] text-muted-foreground mt-1.5 leading-tight">{k.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── Top Export Destinations ────────────────────────────────── */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="font-heading text-base">Top Export Destinations</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">By shipment value — current fiscal year</p>
              </div>
              <Badge className="bg-accent/10 text-accent border-accent/30 border text-xs">10 Active Markets</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {DEST_COUNTRIES.map((c) => (
                <div key={c.country} className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                  <span className="text-xl w-7 shrink-0 leading-none">{c.flag}</span>
                  <span className="text-[11px] text-muted-foreground font-medium w-5 shrink-0">#{c.rank}</span>
                  <span className="flex-1 text-sm font-semibold">{c.country}</span>
                  <span className="text-[11px] text-muted-foreground hidden sm:block">{c.shipments} shipments</span>
                  <span className="text-sm font-bold text-accent w-20 text-right">${c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── Business Statistics Panel ─────────────────────────────────── */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-heading text-base">OG Exports by the Numbers</CardTitle>
            <p className="text-xs text-muted-foreground">Aggregate business performance metrics — current fiscal year</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {BIZ_STATS.map(stat => (
                <StatCounter key={stat.label} stat={stat} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Spend Trend */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="font-heading text-base">Monthly Purchase Value</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">12-month trend — all commodities combined (USD)</p>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">+35% YoY</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={monthlySpend} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="analyticsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0F3D2E" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#0F3D2E" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`$${v.toLocaleString()}`, "Spend"]} />
                <Area type="monotone" dataKey="value" stroke="#0F3D2E" strokeWidth={2.5} fill="url(#analyticsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* ─── Enhanced Commodity Breakdown ─────────────────────────── */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Commodity Spend Breakdown</CardTitle>
              <p className="text-xs text-muted-foreground">Total spend distribution by commodity (USD)</p>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 items-center">
                <div className="shrink-0">
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie
                        data={COMMODITY_SPEND}
                        cx="50%" cy="50%"
                        innerRadius={52} outerRadius={82}
                        dataKey="value"
                        paddingAngle={3}
                        labelLine={false}
                      >
                        {COMMODITY_SPEND.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      {/* @ts-ignore */}
                      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central">
                        <CenterLabel total={COMMODITY_TOTAL} />
                      </text>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }}
                        formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2.5">
                  {COMMODITY_SPEND.map(c => {
                    const pct = Math.round((c.value / COMMODITY_TOTAL) * 100)
                    return (
                      <div key={c.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.color }} />
                            {c.name}
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">${c.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-muted-foreground">({pct}%)</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c.color }} />
                        </div>
                      </div>
                    )
                  })}
                  <div className="pt-2 border-t border-border flex justify-between text-xs">
                    <span className="text-muted-foreground font-medium">Total</span>
                    <span className="font-bold text-foreground">${COMMODITY_TOTAL.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipment Performance */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="font-heading text-base">Shipment Performance</CardTitle>
              <p className="text-xs text-muted-foreground">On-time vs delayed deliveries by month</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={SHIPMENT_PERF} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} />
                  <Legend wrapperStyle={{ fontSize: "11px" }} />
                  <Bar dataKey="onTime" name="On Time" fill="#4CAF50" radius={[4,4,0,0]} />
                  <Bar dataKey="late"   name="Delayed" fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-3">
                {[
                  { label: "On-Time Rate",  value: "92%",    cls: "text-emerald-500" },
                  { label: "Avg. Transit",  value: "8 days", cls: "text-foreground"  },
                  { label: "Total Shipped", value: "9",      cls: "text-foreground"  },
                ].map(s => (
                  <div key={s.label} className="p-2.5 rounded-xl bg-muted/30 text-center">
                    <p className={`text-sm font-bold ${s.cls}`}>{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── Destination Country Table ──────────────────────────────────── */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="font-heading text-base">Top 10 Destination Countries</CardTitle>
                <p className="text-xs text-muted-foreground">Ranked by export value — shipments, USD value, % of total</p>
              </div>
              <Badge className="bg-accent/10 text-accent border-accent/30 border text-xs">Ranked</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rank</th>
                    <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Country</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Shipments</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Value (USD)</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">% of Total</th>
                    <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Trend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {DEST_COUNTRIES.map(c => {
                    const pct = ((c.value / DEST_TOTAL) * 100).toFixed(1)
                    return (
                      <tr key={c.country} className="hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-3">
                          <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground">
                            {c.rank}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="flex items-center gap-2 text-sm font-medium">
                            <span className="text-xl">{c.flag}</span>{c.country}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right text-sm font-bold">{c.shipments}</td>
                        <td className="py-3 px-3 text-right text-sm font-bold text-accent">
                          ${c.value.toLocaleString()}
                        </td>
                        <td className="py-3 px-3 hidden sm:table-cell">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[11px] text-muted-foreground w-8 text-right">{pct}%</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 hidden md:table-cell text-right">
                          {c.trend === "up"
                            ? <ArrowUpRight className="w-4 h-4 text-emerald-500 inline" />
                            : <span className="text-[11px] text-muted-foreground">—</span>
                          }
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </BuyerPortalLayout>
  )
}
