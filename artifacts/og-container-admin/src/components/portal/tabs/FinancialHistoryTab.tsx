import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Download, Search, ArrowUpRight, ArrowDownRight, TrendingUp,
  CircleDollarSign, FileText, BarChart3, Star
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts"
import { INVESTOR_PORTFOLIO, MOCK_TRANSACTIONS } from "@/data/investments"

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

type TxType = "deposit" | "withdrawal" | "investment" | "return" | "fee"

const TYPE_CONFIG: Record<string, { label: string; color: string; icon: any; badgeClass: string }> = {
  deposit: { label: "Deposit", color: "text-emerald-500", icon: ArrowDownRight, badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30" },
  withdrawal: { label: "Withdrawal", color: "text-red-500", icon: ArrowUpRight, badgeClass: "bg-red-500/10 text-red-600 border-red-500/30" },
  investment: { label: "Investment", color: "text-blue-500", icon: TrendingUp, badgeClass: "bg-blue-500/10 text-blue-600 border-blue-500/30" },
  return: { label: "Return", color: "text-amber-500", icon: Star, badgeClass: "bg-amber-500/10 text-amber-600 border-amber-500/30" },
}

const STATUS_BADGE: Record<string, string> = {
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  active: "bg-blue-500/10 text-blue-600 border-blue-500/30",
}

export function FinancialHistoryTab() {
  const { toast } = useToast()
  const [search, setSearch] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const filtered = MOCK_TRANSACTIONS.filter(tx => {
    const matchSearch = tx.description.toLowerCase().includes(search.toLowerCase()) || tx.ref.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === "all" || tx.type === typeFilter
    return matchSearch && matchType
  })

  // Format data for chart
  const chartData = useMemo(() => {
    return INVESTOR_PORTFOLIO.monthlyData.map(d => ({
      month: d.month,
      deposits: Math.round(d.value * 0.3), // Simulated for chart visuals
      returns: d.returns
    }))
  }, [])

  const handleDownload = (format: "pdf" | "csv") => {
    toast({ title: `Generating Statement`, description: `Your ${format.toUpperCase()} statement is being prepared.` })
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Deposited", value: fmt(INVESTOR_PORTFOLIO.totalDeposited), icon: ArrowDownRight, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-l-emerald-500" },
          { label: "Total Withdrawn", value: fmt(INVESTOR_PORTFOLIO.totalWithdrawn), icon: ArrowUpRight, color: "text-red-500", bg: "bg-red-500/10", border: "border-l-red-500" },
          { label: "Total Invested", value: fmt(INVESTOR_PORTFOLIO.invested), icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-l-blue-500" },
          { label: "Total Returns", value: fmt(INVESTOR_PORTFOLIO.expectedReturns), icon: CircleDollarSign, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-l-amber-500" },
        ].map(c => (
          <Card key={c.label} className={`border-border/60 bg-card/80 relative overflow-hidden`}>
            <div className={`absolute inset-y-0 left-0 w-1 ${c.border}`} />
            <CardContent className="p-5 pl-6 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center shrink-0`}>
                <c.icon className={`w-5 h-5 ${c.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                <p className="text-xl font-heading font-bold">{c.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly chart */}
      <Card className="border-border/60 bg-card/80">
        <CardHeader className="pb-0">
          <CardTitle className="text-base font-heading flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" /> Monthly Cashflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(val) => fmt(val)} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }}
                  itemStyle={{ fontSize: 13 }}
                  formatter={(val: number) => [fmt(val), '']}
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Bar dataKey="deposits" name="Deposits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="returns" name="Returns" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filters & Table */}
      <Card className="border-border/60">
        <CardHeader className="border-b border-border/40 pb-4">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <CardTitle className="text-base font-heading">Transaction History</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => handleDownload("pdf")}>
                <Download className="w-3.5 h-3.5" /> PDF
              </Button>
              <Button size="sm" variant="outline" className="gap-2 text-xs" onClick={() => handleDownload("csv")}>
                <Download className="w-3.5 h-3.5" /> CSV
              </Button>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="Search by description or reference..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All Types</option>
                {Object.keys(TYPE_CONFIG).map(t => <option key={t} value={t}>{TYPE_CONFIG[t].label}</option>)}
              </select>
            </div>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 text-muted-foreground bg-muted/20">
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">Date</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">Type</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">Description</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">Reference</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">Amount</th>
                <th className="text-left px-5 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20">
              {filtered.map(tx => {
                const cfg = TYPE_CONFIG[tx.type] || { icon: FileText, color: "text-muted-foreground", label: tx.type, badgeClass: "" }
                const Icon = cfg.icon
                return (
                  <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-5 py-4 text-xs text-muted-foreground whitespace-nowrap">{tx.date}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${cfg.color.replace('text-', 'bg-').replace('500', '500/10')}`}>
                          <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        </div>
                        <span className="text-xs font-medium capitalize">{cfg.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium">{tx.description}</td>
                    <td className="px-5 py-4 font-mono text-xs text-muted-foreground">{tx.ref}</td>
                    <td className={`px-5 py-4 font-bold whitespace-nowrap ${tx.amount >= 0 ? "text-emerald-500" : "text-foreground"}`}>
                      {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className={`text-[10px] capitalize ${STATUS_BADGE[tx.status] || ""}`}>{tx.status}</Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">No transactions found.</div>
          )}
        </div>
        <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
          <span>Showing {filtered.length} of {MOCK_TRANSACTIONS.length} transactions</span>
        </div>
      </Card>
    </div>
  )
}
