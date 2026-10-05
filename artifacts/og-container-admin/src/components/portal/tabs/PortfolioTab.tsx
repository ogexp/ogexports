import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { useCurrency } from "@/lib/use-currency"
import { formatInvestorLedgerAmount } from "@/lib/format-investor-ledger"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  BarChart3,
  CircleDollarSign,
  Landmark,
  Leaf,
  Package,
  PieChart as PieChartIcon,
  Wallet,
  type LucideIcon,
} from "lucide-react"

interface DashboardSummary {
  total_investment?: number | null
  total_investment_usd?: number | null
  active_investment?: number | null
  active_investment_usd?: number | null
  active_investments_count?: number | null
  investments_count?: number | null
  available_balance?: number | null
  total_profit_earned?: number | null
  total_profit_earned_usd?: number | null
  total_deposits?: number | null
  total_deposits_usd?: number | null
  total_withdrawals?: number | null
  total_withdrawals_usd?: number | null
}

interface PortfolioInvestment {
  id: string | number
  plan?: string | null
  reference?: string | null
  container_no?: string | null
  type?: string | null
  status?: string | null
  amount?: number | null
  amount_pkr?: number | null
  amount_currency?: string | null
  profit_amount?: number | null
  profit_amount_pkr?: number | null
  invest_date?: string | null
}

interface InvestorDashboard {
  wallet?: { currency?: string; available_balance?: number | null }
  fx?: { display_usd_rate?: number | null }
  summary?: DashboardSummary
  portfolio_series?: {
    points?: Array<{ date: string; date_label?: string; value: number; profit: number }>
  }
  allocation?: Array<{ name: string; value: number; color: string; amount?: number }>
  my_investments?: PortfolioInvestment[]
}

function formatDirectAmount(value: number | null | undefined, currency?: string | null) {
  if (value == null || !Number.isFinite(Number(value)) || !currency) return "Unavailable"
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  } catch {
    return "Unavailable"
  }
}

function KpiCard({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  detail?: string
  icon: LucideIcon
  accent: string
}) {
  return (
    <Card className="relative overflow-hidden border-border/60 bg-card/80 backdrop-blur">
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium uppercase leading-tight tracking-wider text-muted-foreground">{label}</p>
            <p className="truncate text-2xl font-bold font-heading">{value}</p>
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${accent.replace("border-l-", "bg-").replace("-500", "-500/10")}`}>
            <Icon className={`h-5 w-5 ${accent.replace("border-l-", "text-")}`} />
          </div>
        </div>
        {detail && <p className="mt-3 text-xs text-muted-foreground">{detail}</p>}
      </CardContent>
    </Card>
  )
}

export function PortfolioTab() {
  const currencyContext = useCurrency()
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["investor", "dashboard"],
    queryFn: () => api.get<{ data: InvestorDashboard }>("/api/investor/dashboard"),
    staleTime: 30_000,
  })

  if (isLoading) {
    return <div className="py-16 text-center text-sm text-muted-foreground">Loading portfolio data…</div>
  }

  const dashboard = data?.data
  if (isError || !dashboard) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="space-y-3 py-10 text-center">
          <p className="font-medium">Portfolio data is unavailable.</p>
          <p className="text-sm text-muted-foreground">The figures will appear when the investor API responds.</p>
          <button className="text-sm font-medium text-primary underline underline-offset-4" onClick={() => void refetch()}>
            Retry
          </button>
        </CardContent>
      </Card>
    )
  }

  const summary = dashboard.summary ?? {}
  const ledgerCurrency = dashboard.wallet?.currency ?? null
  const rawRate = Number(dashboard.fx?.display_usd_rate)
  const displayRate = Number.isFinite(rawRate) && rawRate > 0 ? rawRate : null
  const formatWalletAmount = (amount?: number | null, usdAmount?: number | null) => {
    if (amount == null || !ledgerCurrency) return "Unavailable"
    return formatInvestorLedgerAmount(currencyContext, amount, {
      usdAmount,
      ledgerCurrency,
      lockedRate: displayRate,
    })
  }
  const portfolioPoints = (dashboard.portfolio_series?.points ?? []).map((point) => ({
    ...point,
    date_label: point.date_label || point.date,
  }))
  const allocations = dashboard.allocation ?? []
  const investments = dashboard.my_investments ?? []

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Investment"
          value={formatWalletAmount(summary.total_investment, summary.total_investment_usd)}
          detail={summary.investments_count == null ? undefined : `${summary.investments_count} recorded investments`}
          icon={PieChartIcon}
          accent="border-l-emerald-500"
        />
        <KpiCard
          label="Active Investment"
          value={formatWalletAmount(summary.active_investment, summary.active_investment_usd)}
          detail={summary.active_investments_count == null ? undefined : `${summary.active_investments_count} active positions`}
          icon={Landmark}
          accent="border-l-amber-500"
        />
        <KpiCard
          label="Available Balance"
          value={formatWalletAmount(summary.available_balance ?? dashboard.wallet?.available_balance)}
          icon={Wallet}
          accent="border-l-blue-500"
        />
        <KpiCard
          label="Profit Earned"
          value={formatWalletAmount(summary.total_profit_earned, summary.total_profit_earned_usd)}
          icon={CircleDollarSign}
          accent="border-l-violet-500"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="border-border/60 bg-card/80 lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-heading">
              <BarChart3 className="h-4 w-4 text-primary" /> Portfolio History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {portfolioPoints.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No portfolio history has been recorded.
              </div>
            ) : (
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioPoints} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="portfolioValueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="date_label" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(value: number) => formatWalletAmount(value)} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      formatter={(value) => [formatWalletAmount(Number(value)), "Portfolio value"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#portfolioValueFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80 lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base font-heading">
              <PieChartIcon className="h-4 w-4 text-primary" /> Asset Allocation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center">
            {allocations.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No allocation data is available.
              </div>
            ) : (
              <>
                <div className="mt-2 h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={allocations} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value" stroke="none">
                        {allocations.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${Number(value)}%`, "Allocation"]}
                        contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid w-full grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                  {allocations.map((entry) => (
                    <div key={entry.name} className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex min-w-0 items-center gap-1.5">
                        <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
                        <span className="truncate text-muted-foreground">{entry.name}</span>
                      </div>
                      <span className="shrink-0 font-medium">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Deposits", value: formatWalletAmount(summary.total_deposits, summary.total_deposits_usd), color: "text-emerald-500" },
          { label: "Total Withdrawals", value: formatWalletAmount(summary.total_withdrawals, summary.total_withdrawals_usd), color: "text-amber-500" },
          { label: "Recorded Investments", value: summary.investments_count == null ? "Unavailable" : String(summary.investments_count), color: "text-blue-500" },
          { label: "Active Positions", value: summary.active_investments_count == null ? "Unavailable" : String(summary.active_investments_count), color: "text-violet-500" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/50 bg-muted/40 p-4 text-center">
            <p className="mb-1 text-xs text-muted-foreground">{stat.label}</p>
            <p className={`text-lg font-bold font-heading ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <Card className="border-border/60 bg-card/80">
        <CardHeader className="border-b border-border/40 pb-4">
          <CardTitle className="text-base font-heading">Recent Investments</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/20 text-muted-foreground">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider">Investment / Trade</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider">Recorded Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {investments.map((investment) => {
                const amountCurrency = investment.amount_currency?.toUpperCase() || null
                const amount = amountCurrency === "PKR"
                  ? investment.amount_pkr
                  : amountCurrency
                    ? investment.amount
                    : null
                const completed = investment.status?.toLowerCase() === "completed"
                const profitCurrency = investment.profit_amount_pkr != null ? "PKR" : amountCurrency
                const profitAmount = investment.profit_amount_pkr ?? investment.profit_amount
                return (
                  <tr key={investment.id} className="transition-colors hover:bg-muted/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${investment.type === "export" ? "bg-blue-500/10 text-blue-500" : "bg-emerald-500/10 text-emerald-500"}`}>
                          {investment.type === "export" ? <Package className="h-4 w-4" /> : <Leaf className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-medium">{investment.plan || "Investment"}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {investment.container_no || investment.reference || "Trade reference unavailable"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 font-semibold">{formatDirectAmount(amount, amountCurrency)}</td>
                    <td className="px-5 py-4">
                      <Badge variant="outline" className="capitalize">{investment.status || "Unavailable"}</Badge>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right font-medium">
                      {completed && profitAmount != null ? formatDirectAmount(profitAmount, profitCurrency) : "Not recorded"}
                    </td>
                  </tr>
                )
              })}
              {investments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-sm text-muted-foreground">
                    No investments are available for this account.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
