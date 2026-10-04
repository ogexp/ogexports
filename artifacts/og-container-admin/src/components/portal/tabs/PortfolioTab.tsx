import { useState } from "react"
import { Link } from "wouter"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ContainerStatusBadge } from "../status-badges"
import {
  Wallet, TrendingUp, PieChart, Landmark, CircleDollarSign, BarChart3,
  Clock, CheckCircle2, AlertCircle, Download, Package, Leaf
} from "lucide-react"
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, PieChart as RePieChart, Pie, Cell } from 'recharts'
import { INVESTOR_PORTFOLIO, CONTAINER_INVESTMENTS, LONG_TERM_PROJECTS } from "@/data/investments"

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

function KpiCard({ label, value, trend, trendLabel, icon: Icon, accent }: { label: string; value: string; trend?: string; trendLabel?: string; icon: any; accent: string }) {
  return (
    <Card className={`border-border/60 bg-card/80 backdrop-blur relative overflow-hidden`}>
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium leading-tight">{label}</p>
            <p className="text-2xl font-heading font-bold truncate">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent.replace("border-l-", "bg-").replace("-500", "-500/10")}`}>
            <Icon className={`w-5 h-5 ${accent.replace("border-l-", "text-")}`} />
          </div>
        </div>
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span className="text-xs font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{trend}</span>
            <span className="text-xs text-muted-foreground">{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export function PortfolioTab() {
  const [activeSection, setActiveSection] = useState<"containers" | "longterm" | "all">("all")
  const dash = INVESTOR_PORTFOLIO

  return (
    <div className="space-y-8">
      {/* 4 KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Portfolio Value" value={fmt(dash.totalValue)} trend="+12.4%" trendLabel="all-time" icon={PieChart} accent="border-l-emerald-500" />
        <KpiCard label="Available Balance" value={fmt(dash.available)} icon={Wallet} accent="border-l-blue-500" />
        <KpiCard label="Total Invested" value={fmt(dash.totalInvested)} trend={`${dash.activeInvestments} active`} trendLabel="commitments" icon={Landmark} accent="border-l-amber-500" />
        <KpiCard label="Expected Returns" value={fmt(dash.expectedReturns)} icon={CircleDollarSign} accent="border-l-violet-500" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Performance Chart */}
        <Card className="border-border/60 bg-card/80 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Portfolio Growth
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dash.monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorInv" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => fmt(val)} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                    itemStyle={{ fontSize: 13 }}
                    formatter={(val: number) => [fmt(val), '']}
                  />
                  <Area type="monotone" dataKey="value" name="Total Value" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorVal)" />
                  <Area type="monotone" dataKey="invested" name="Invested" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorInv)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Commodity allocation */}
        <Card className="border-border/60 bg-card/80 lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="text-base font-heading flex items-center gap-2">
              <PieChart className="w-4 h-4 text-primary" /> Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            <div className="h-48 w-full mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={dash.commodityAllocation}
                    cx="50%" cy="50%"
                    innerRadius={60} outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {dash.commodityAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: number) => fmt(val)}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  />
                </RePieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 w-full mt-2">
              {dash.commodityAllocation.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="text-muted-foreground">{c.name}</span>
                  </div>
                  <span className="font-medium">{Math.round((c.value / dash.totalInvested) * 100)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Deposits", value: fmt(dash.totalDeposited), color: "text-emerald-500" },
          { label: "Total Withdrawals", value: fmt(dash.totalWithdrawn), color: "text-amber-500" },
          { label: "Completed Trades", value: dash.completedInvestments, color: "text-blue-500" },
          { label: "Pending Processing", value: dash.pendingInvestments, color: "text-violet-500" },
        ].map(s => (
          <div key={s.label} className="bg-muted/40 rounded-xl p-4 border border-border/50 text-center">
            <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
            <p className={`text-xl font-heading font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Active Holdings Table */}
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="border-b border-border/40 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-heading">Active Holdings</CardTitle>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5"><Download className="w-3.5 h-3.5" /> PDF Report</Button>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 text-muted-foreground bg-muted/20">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Investment</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Amount</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Expected ROI</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Days Left</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium">Status</th>
                <th className="text-right px-5 py-3 text-xs uppercase tracking-wider font-medium">Est. Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {dash.activeHoldings.map((h) => (
                <tr key={h.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${h.type === 'container' ? 'bg-blue-500/10 text-blue-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                        {h.type === 'container' ? <Package className="w-4 h-4" /> : <Leaf className="w-4 h-4" />}
                      </div>
                      <Link href={`/invest/${h.refId}`} className="font-medium hover:text-primary transition-colors">{h.name}</Link>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold">{fmt(h.amount)}</td>
                  <td className="px-5 py-4 text-emerald-500 font-medium">+{h.returnPct}%</td>
                  <td className="px-5 py-4 text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> {h.daysLeft}
                  </td>
                  <td className="px-5 py-4">
                    <Badge variant="outline" className={`capitalize ${h.status === 'shipping' ? 'bg-blue-500/10 text-blue-500 border-blue-500/30' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'}`}>
                      {h.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 font-bold text-right">{fmt(h.amount + h.expectedReturn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
