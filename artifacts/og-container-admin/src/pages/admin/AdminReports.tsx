import { useState, useRef, useEffect } from "react"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { BarChart2, Download, FileText, TrendingUp, DollarSign, Users, Ship, ShoppingBag, Calendar, CheckCircle2, Printer, Globe, Package, Award, Clock } from "lucide-react"
import { AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts"
import {
  getOrders, getUsers, getShipments,
  fetchAdminReports, getAdminReports,
  formatAdminMoney, formatAdminPct,
  type AdminReportsData,
} from "@/lib/admin-data"

const GOLD = "#D4A012"
const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"

// Decorative chart series — empty until wired to live analytics endpoints
const BUYER_ACQUISITION: { month: string; new: number; total: number }[] = []
const BUYER_COUNTRIES: { name: string; value: number; color: string }[] = []
const TOP_PRODUCTS: { name: string; revenue: number; orders: number; growth: number }[] = []
const INVEST_ROI: { month: string; containers: number; produce: number; plant: number }[] = []

const PERIOD_OPTIONS = [
  { key: "week",     label: "This Week"    },
  { key: "month",    label: "This Month"   },
  { key: "quarter",  label: "This Quarter" },
  { key: "year",     label: "This Year"    },
  { key: "lastyear", label: "Last Year"    },
]

const TABS = [
  { id: "financial",   label: "Financial Reports",   icon: DollarSign  },
  { id: "buyers",      label: "Buyer Analytics",     icon: Users       },
  { id: "products",    label: "Product Performance", icon: ShoppingBag },
  { id: "investments", label: "Investment Reports",  icon: TrendingUp  },
  { id: "logistics",   label: "Logistics Reports",   icon: Ship        },
  { id: "bizstats",    label: "Business Stats",      icon: BarChart2   },
]

// Product performance table — empty until product revenue analytics are wired
const PRODUCT_PERF_TABLE: { name: string; category: string; revenue: number; orders: number; growth: number; stock: string }[] = []

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gray-900 text-white px-4 py-3 rounded-xl shadow-2xl text-sm">
      <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
      <span>{msg}</span>
      <button onClick={onClose} className="ml-2 text-gray-400 hover:text-white">✕</button>
    </div>
  )
}

export default function AdminReports() {
  const [activeTab, setActiveTab] = useState("financial")
  const [period, setPeriod] = useState("year")
  const [toast, setToast] = useState("")
  const printRef = useRef<HTMLDivElement>(null)
  const [reports, setReports] = useState<AdminReportsData>(() => getAdminReports())

  const orders    = getOrders()
  const users     = getUsers()
  const shipments = getShipments()

  useEffect(() => {
    void fetchAdminReports().then(setReports)
  }, [])

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000) }

  const handleExport = (type: string) => {
    showToast(`${type} report exported as PDF`)
  }

  const handlePrint = () => {
    window.print()
  }

  const apiTrend = reports.revenueTrend.length > 0 ? reports.revenueTrend : [{ month: "—", revenue: 0, profit: 0, expenses: 0 }]
  // Always prefer API revenue trend for financial KPI totals — never REVENUE_DATA mock amounts.
  const revenueData = period === "quarter"
    ? apiTrend.slice(-6)
    : period === "week"
      ? apiTrend.slice(-1)
      : period === "month"
        ? apiTrend.slice(-1)
        : apiTrend
  const revTotal    = revenueData.reduce((s, r) => s + r.revenue,  0)
  const profTotal   = revenueData.reduce((s, r) => s + (r.profit ?? 0),   0)
  const expTotal    = revenueData.reduce((s, r) => s + (r.expenses ?? 0), 0)
  const quarterlyData = reports.quarterlyRevenue.length > 0 ? reports.quarterlyRevenue : [{ quarter: "—", revenue: 0 }]

  const bizKpis = [
    { label: "Total Revenue (YTD)",   value: formatAdminMoney(reports.businessStats.totalRevenueYtd),  sub: `${formatAdminPct(reports.businessStats.revenueYoyPct)} YoY`,  color: GREEN   },
    { label: "Total Profit (YTD)",    value: formatAdminMoney(reports.businessStats.totalProfitYtd),   sub: `${reports.businessStats.profitMarginPct || 0}% margin`, color: GOLD   },
    { label: "Total Orders",          value: String(reports.businessStats.totalOrders || 0),     sub: `${formatAdminPct(reports.businessStats.ordersYoyPct)} YoY`,  color: "#3b82f6" },
    { label: "Active Buyers",         value: String(reports.businessStats.activeBuyers || 0),     sub: `${formatAdminPct(reports.businessStats.buyersYoyPct)} YoY`,  color: EMERALD },
    { label: "Countries Reached",     value: String(reports.businessStats.countriesReached || 0),      sub: "Global footprint", color: "#8b5cf6" },
    { label: "Products Catalogued",   value: String(reports.businessStats.productsCatalogued || 0),      sub: `${reports.businessStats.productsApproved || 0} approved`, color: "#f59e0b" },
    { label: "On-Time Delivery",      value: `${reports.businessStats.onTimeDeliveryPct || 0}%`,   sub: "Delivered vs ETA",   color: GREEN   },
    { label: "Avg. Lead Time",        value: `${reports.businessStats.avgLeadTimeDays || 0} days`, sub: "Not tracked", color: GOLD    },
    { label: "Customer Satisfaction", value: `${reports.businessStats.customerSatisfaction || 0}/5`,   sub: "Not tracked", color: "#ec4899" },
    { label: "Compliance Rate",       value: `${reports.businessStats.complianceRatePct || 0}%`,   sub: "Not tracked", color: EMERALD },
  ]

  const investmentTypeColors = [EMERALD, GREEN, GOLD, "#3b82f6", "#8b5cf6"]

  return (
    <AdminLayout title="Reports & Analytics" subtitle="Comprehensive business intelligence and reporting">
      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #report-print-area, #report-print-area * { visibility: visible; }
          #report-print-area { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="p-6 space-y-5" id="report-print-area" ref={printRef}>
        {/* Controls */}
        <div className="flex items-center justify-between flex-wrap gap-3 no-print">
          {/* Period selector */}
          <div className="flex gap-1 bg-white border border-border rounded-xl p-1 overflow-x-auto">
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap"
                style={{
                  background: period === p.key ? EMERALD : "transparent",
                  color: period === p.key ? "white" : "#64748b",
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Print / PDF button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border border-border bg-white text-slate-700 hover:bg-slate-50 transition-all"
            >
              <Printer className="w-4 h-4" /> Export to PDF
            </button>
            <button
              onClick={() => handleExport(activeTab)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm"
              style={{ background: EMERALD }}
            >
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Revenue", value: formatAdminMoney(reports.kpis.totalRevenue), change: formatAdminPct(reports.kpis.revenueYoyPct), color: GREEN },
            { label: "Total Orders",  value: String(reports.kpis.ordersTotal || orders.length || 0), change: formatAdminPct(reports.kpis.ordersYoyPct), color: "#3b82f6" },
            { label: "Active Buyers", value: String(reports.kpis.activeBuyers || users.filter(u => u.accountType === "buyer" && u.status === "active").length || 0), change: formatAdminPct(reports.kpis.buyersYoyPct), color: GOLD },
            { label: "Shipments",     value: String(reports.kpis.shipmentsTotal || shipments.length || 0), change: formatAdminPct(reports.kpis.shipmentsYoyPct), color: EMERALD },
          ].map(k => (
            <div key={k.label} className="bg-white rounded-xl border border-border p-4">
              <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="text-[10px] font-bold text-green-600 mt-1">{k.change} vs prev period</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-border">
          <div className="flex gap-1 p-4 border-b border-border overflow-x-auto no-print">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
                style={{
                  background: activeTab === t.id ? EMERALD : "transparent",
                  color: activeTab === t.id ? "white" : "#64748b",
                }}
              >
                <t.icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            ))}
          </div>

          <div className="p-5">

            {/* ─── Financial ─────────────────────────────────────────────── */}
            {activeTab === "financial" && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-sm">Revenue, Profit & Expenses</h3>
                    <button onClick={() => handleExport("Financial")} className="text-[11px] text-muted-foreground hover:underline flex items-center gap-1 no-print">
                      <FileText className="w-3 h-3" /> Export CSV
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">
                    Financial performance — {PERIOD_OPTIONS.find(p => p.key === period)?.label}
                  </p>
                  <ResponsiveContainer width="100%" height={260}>
                    <AreaChart data={revenueData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="rG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GREEN} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={GREEN} stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="pG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={GOLD} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, ""]} />
                      <Area type="monotone" dataKey="revenue"  stroke={GREEN}    fill="url(#rG)" strokeWidth={2} name="Revenue"  />
                      <Area type="monotone" dataKey="profit"   stroke={GOLD}     fill="url(#pG)" strokeWidth={2} name="Profit"   />
                      <Area type="monotone" dataKey="expenses" stroke="#ef4444"  fill="transparent" strokeWidth={1.5} strokeDasharray="4 2" name="Expenses" />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {[
                    { label: "Total Revenue", value: formatAdminMoney(revTotal, false),  sub: `${PERIOD_OPTIONS.find(p=>p.key===period)?.label}`, color: GREEN     },
                    { label: "Total Profit",  value: formatAdminMoney(profTotal, false), sub: `${revTotal > 0 ? Math.round((profTotal/revTotal)*100) : 0}% margin`,   color: GOLD      },
                    { label: "Total Expenses",value: formatAdminMoney(expTotal, false),  sub: `${revTotal > 0 ? Math.round((expTotal/revTotal)*100) : 0}% of revenue`,color: "#ef4444" },
                  ].map(s => (
                    <div key={s.label} className="p-4 border border-border rounded-xl">
                      <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
                      <div className="text-sm font-medium mt-0.5">{s.label}</div>
                      <div className="text-[11px] text-muted-foreground">{s.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Buyers ────────────────────────────────────────────────── */}
            {activeTab === "buyers" && (
              <div className="space-y-6">
                <div className="grid lg:grid-cols-2 gap-5">
                  <div>
                    <h3 className="font-bold text-sm mb-1">Buyer Distribution by Country</h3>
                    <p className="text-xs text-muted-foreground mb-4">Percentage of total buyer volume</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={BUYER_COUNTRIES} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                          {BUYER_COUNTRIES.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}%`, ""]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                      {BUYER_COUNTRIES.map(c => (
                        <div key={c.name} className="flex items-center gap-2 text-[11px]">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: c.color }} />
                          <span className="text-muted-foreground">{c.name}</span>
                          <span className="font-semibold ml-auto">{c.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm mb-1">Buyer Registration Growth</h3>
                    <p className="text-xs text-muted-foreground mb-4">Monthly new buyer registrations & cumulative total</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={BUYER_ACQUISITION} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
                        <Bar dataKey="new" fill={GREEN} name="New Buyers" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                {/* Buyer acquisition line chart */}
                <div>
                  <h3 className="font-bold text-sm mb-1">Cumulative Buyer Base Growth</h3>
                  <p className="text-xs text-muted-foreground mb-4">Total active buyers over time</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={BUYER_ACQUISITION} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} domain={[100, 320]} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
                      <Line type="monotone" dataKey="total" stroke={GOLD} strokeWidth={2.5} name="Total Buyers" dot={{ fill: GOLD, r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ─── Products ──────────────────────────────────────────────── */}
            {activeTab === "products" && (
              <div className="space-y-4">
                <h3 className="font-bold text-sm">Top Performing Products</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["#", "Product", "Category", "Revenue", "Orders", "Growth", "Revenue Share"].map(h => (
                          <th key={h} className="text-left px-3 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PRODUCT_PERF_TABLE.map((p, i) => {
                        const totalRev = PRODUCT_PERF_TABLE.reduce((s, x) => s + x.revenue, 0)
                        const pct = Math.round((p.revenue / totalRev) * 100)
                        return (
                          <tr key={p.name} className="border-b border-border/50 hover:bg-muted/20">
                            <td className="px-3 py-3 text-[12px] font-bold text-muted-foreground">{i + 1}</td>
                            <td className="px-3 py-3 font-semibold text-[13px]">{p.name}</td>
                            <td className="px-3 py-3">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">{p.category}</span>
                            </td>
                            <td className="px-3 py-3 text-[12px] font-bold" style={{ color: GREEN }}>${p.revenue.toLocaleString()}</td>
                            <td className="px-3 py-3 text-[12px]">{p.orders}</td>
                            <td className="px-3 py-3">
                              <span className="text-[11px] font-bold text-green-600">+{p.growth}%</span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: EMERALD }} />
                                </div>
                                <span className="text-[11px] text-muted-foreground">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ─── Investments ───────────────────────────────────────────── */}
            {activeTab === "investments" && (
              <div className="space-y-5">
                <div>
                  <h3 className="font-bold text-sm mb-1">ROI Performance by Investment Type</h3>
                  <p className="text-xs text-muted-foreground mb-4">Monthly ROI % across investment categories</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <LineChart data={INVEST_ROI} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} domain={[12, 25]} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}%`, ""]} />
                      <Line type="monotone" dataKey="containers" stroke={EMERALD} strokeWidth={2.5} name="Containers" dot={false} />
                      <Line type="monotone" dataKey="produce"    stroke={GREEN}   strokeWidth={2.5} name="Produce"    dot={false} />
                      <Line type="monotone" dataKey="plant"      stroke={GOLD}    strokeWidth={2.5} name="Plant"      dot={false} />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid sm:grid-cols-3 gap-4">
                  {(reports.investmentsByType.length
                    ? reports.investmentsByType
                    : [{ type: "Container", raised: 0, investors: 0, avgRoiPct: 0 }, { type: "Fresh Produce", raised: 0, investors: 0, avgRoiPct: 0 }, { type: "Potato Plant", raised: 0, investors: 0, avgRoiPct: 0 }]
                  ).slice(0, 3).map((s, i) => (
                    <div key={s.type} className="p-4 border border-border rounded-xl">
                      <div className="text-2xl font-bold" style={{ color: investmentTypeColors[i % investmentTypeColors.length] }}>{s.avgRoiPct || 0}%</div>
                      <div className="text-sm font-semibold mt-0.5">{s.type} Investments</div>
                      <div className="text-[11px] text-muted-foreground">{s.investors || 0} investors · {formatAdminMoney(s.raised)} raised</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Logistics ─────────────────────────────────────────────── */}
            {activeTab === "logistics" && (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Shipments", value: String(reports.logistics.totalShipments || shipments.length || 0),                                          color: EMERALD    },
                    { label: "In Transit",       value: String(reports.logistics.inTransit || shipments.filter(s => s.status === "in-transit").length || 0),  color: "#0ea5e9"  },
                    { label: "Delivered",        value: String(reports.logistics.delivered || shipments.filter(s => s.status === "delivered").length || 0),   color: GREEN      },
                    { label: "On-Time Rate",     value: `${reports.logistics.onTimeRatePct || 0}%`,                                                          color: GOLD       },
                  ].map(k => (
                    <div key={k.label} className="p-4 border border-border rounded-xl">
                      <div className="text-xl font-bold" style={{ color: k.color }}>{k.value}</div>
                      <div className="text-xs text-muted-foreground">{k.label}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <h3 className="font-bold text-sm mb-3">Shipment Status Breakdown</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Pending Booking",    count: shipments.filter(s => s.status === "pending").length,    color: "#f59e0b" },
                      { label: "Booking Confirmed",  count: shipments.filter(s => s.status === "booking").length,   color: "#3b82f6" },
                      { label: "In Transit",         count: shipments.filter(s => s.status === "in-transit").length,color: "#0ea5e9" },
                      { label: "Arrived",            count: shipments.filter(s => s.status === "arrived").length,   color: "#8b5cf6" },
                      { label: "Delivered",          count: shipments.filter(s => s.status === "delivered").length, color: GREEN    },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-3">
                        <span className="text-[12px] text-muted-foreground w-36 shrink-0">{s.label}</span>
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${shipments.length > 0 ? (s.count / shipments.length) * 100 : 0}%`, background: s.color }} />
                        </div>
                        <span className="text-[12px] font-semibold w-6 text-right">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Business Stats (NEW 6th tab) ─────────────────────────── */}
            {activeTab === "bizstats" && (
              <div className="space-y-6">
                {/* KPI Grid */}
                <div>
                  <h3 className="font-bold text-sm mb-1">Key Performance Indicators</h3>
                  <p className="text-xs text-muted-foreground mb-4">OG Exports — business-wide metrics snapshot</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                    {bizKpis.map(k => (
                      <div key={k.label} className="p-4 border border-border rounded-xl flex flex-col gap-1">
                        <div className="text-xl font-bold leading-none" style={{ color: k.color }}>{k.value}</div>
                        <div className="text-[12px] font-semibold text-foreground leading-tight">{k.label}</div>
                        <div className="text-[10px] text-muted-foreground">{k.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue by Quarter bar chart */}
                <div>
                  <h3 className="font-bold text-sm mb-1">Revenue by Quarter</h3>
                  <p className="text-xs text-muted-foreground mb-4">Quarterly revenue trend from delivered orders</p>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={quarterlyData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} tickFormatter={v => `$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Revenue"]} />
                      <Bar dataKey="revenue" fill={EMERALD} radius={[6, 6, 0, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Product performance table */}
                <div>
                  <h3 className="font-bold text-sm mb-1">Product Performance Summary</h3>
                  <p className="text-xs text-muted-foreground mb-3">Revenue, orders, and growth by product</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          {["Product", "Category", "Revenue", "Orders", "Growth"].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {PRODUCT_PERF_TABLE.map(p => (
                          <tr key={p.name} className="border-b border-border/40 hover:bg-muted/20">
                            <td className="px-3 py-2.5 font-semibold text-[12px]">{p.name}</td>
                            <td className="px-3 py-2.5">
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">{p.category}</span>
                            </td>
                            <td className="px-3 py-2.5 text-[12px] font-bold" style={{ color: GREEN }}>${p.revenue.toLocaleString()}</td>
                            <td className="px-3 py-2.5 text-[12px]">{p.orders}</td>
                            <td className="px-3 py-2.5">
                              <span className="text-[11px] font-bold text-green-600">+{p.growth}%</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Buyer acquisition line chart */}
                <div>
                  <h3 className="font-bold text-sm mb-1">Buyer Acquisition Trend</h3>
                  <p className="text-xs text-muted-foreground mb-4">New buyer registrations per month — Jan to Jul 2026</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={BUYER_ACQUISITION} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: "white", border: "1px solid #e2e8f0", borderRadius: "8px", fontSize: "12px" }} />
                      <Line type="monotone" dataKey="new"   stroke={GREEN} strokeWidth={2.5} name="New Buyers"   dot={{ fill: GREEN, r: 3 }} />
                      <Line type="monotone" dataKey="total" stroke={GOLD}  strokeWidth={2}   name="Total Buyers" dot={false} strokeDasharray="4 2" />
                      <Legend wrapperStyle={{ fontSize: "11px" }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {toast && <Toast msg={toast} onClose={() => setToast("")} />}
    </AdminLayout>
  )
}
