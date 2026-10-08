import { useMemo, useRef, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { notify } from "@/lib/notify"
import { useCurrency } from "@/lib/use-currency"
import { formatInvestorLedgerAmount } from "@/lib/format-investor-ledger"
import { useLocalAuth } from "@/lib/local-auth"
import { Link, useLocation } from "wouter"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts"
import {
  DollarSign, TrendingUp, Clock, CheckCircle2,
  ArrowUpRight, ArrowDownRight, AlertCircle, Activity, ShieldCheck,
  Ship, AlertTriangle, X, Loader2
} from "lucide-react"
import { api, resolveMediaUrl, toStoredMediaPath } from "@/lib/api"
import { paymentStatusLabel, paymentStatusBadgeClass } from "@/lib/deposit-statuses"
import { investmentStatusLabel, investmentStatusBadgeClass } from "@/lib/investment-statuses"
import { containerProjectStatusLabel, isContainerProjectInvestable } from "@/lib/container-project-statuses"
import { formatContainerLabel } from "@/lib/container-display"
import { kycDashboardBadge } from "@/lib/kyc-badge"
import { InvestorKycRequiredBanner } from "@/components/invest/InvestorKycGate"
import { RecentAlertsCard } from "@/components/portal/RecentAlertsCard"
import { ContainerOpportunityCard } from "@/components/invest/ContainerOpportunityCard"
import { adminToContainer } from "@/lib/invest-mappers"
import { fetchInvestorOpportunities } from "@/lib/investor-opportunities"
import { INVESTOR_DASHBOARD_QUERY_KEY } from "@/lib/investor-balance"

const RANGE_OPTIONS = ["7D", "30D", "90D", "1Y", "Lifetime"] as const
type RangeOption = (typeof RANGE_OPTIONS)[number]

const INVESTMENT_TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "container", label: "Containers" },
  { id: "ricemill", label: "Rice Mill" },
  { id: "feed", label: "Feeds" },
  { id: "produce", label: "Produce" },
  { id: "plant", label: "Plant" },
] as const
type InvestmentTypeFilter = (typeof INVESTMENT_TYPE_FILTERS)[number]["id"]

function projectTypeLabel(type?: string) {
  const map: Record<string, string> = {
    container: "Container",
    ricemill: "Rice Mill",
    feed: "Feed Mill",
    produce: "Produce",
    plant: "Plant",
    cold_storage: "Cold Storage",
    domestic_trading: "Domestic",
  }
  return map[String(type || "").toLowerCase()] || (type ? String(type) : "Investment")
}

const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  active:     { label: "Active",     color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  funding:    { label: "Funding",    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",     dot: "bg-amber-500" },
  pending:    { label: "Pending",    color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",   dot: "bg-yellow-500" },
  cancelled:  { label: "Rejected",   color: "bg-red-500/15 text-red-500",                               dot: "bg-red-500" },
  shipping:   { label: "Shipping",   color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",         dot: "bg-blue-500" },
  in_transit: { label: "In Transit", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400",         dot: "bg-blue-500" },
  customs:    { label: "Customs",    color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",      dot: "bg-amber-500" },
  completed:  { label: "Completed",  color: "bg-muted text-muted-foreground",                           dot: "bg-green-600" },
}

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  funding:   "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  shipping:  "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  completed: "bg-muted text-muted-foreground",
  approved:  "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  pending:   "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
  review:    "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  rejected:  "bg-red-500/15 text-red-500",
  cancelled: "bg-muted text-muted-foreground",
}

const TXN_COLORS: Record<string, string> = {
  Profit:     "text-emerald-500",
  Deposit:    "text-blue-500",
  Withdrawal: "text-red-400",
  Investment: "text-violet-500",
  Bonus:      "text-amber-500",
}

interface DashboardSummary {
  total_investment: number
  active_investment: number
  total_investment_usd: number
  active_investment_usd: number
  active_investments_count: number
  investments_count: number
  available_balance: number
  total_profit_earned: number
  total_profit_earned_usd: number | null
  monthly_profit: number
  monthly_profit_usd: number | null
  lifetime_roi: number
  pending_withdrawals_amount: number
  pending_withdrawals_amount_usd: number | null
  pending_withdrawals_count: number
  pending_deposits_amount: number
  pending_deposits_count: number
  total_deposits: number
  total_deposits_count: number
  total_deposits_usd: number | null
  total_withdrawals: number
  total_withdrawals_count: number
  total_withdrawals_usd: number | null
  completed_transactions: number
}

interface DashboardFx {
  avg_deposit_usd_rate?: number | null
  display_usd_rate?: number | null
  dual_currency_enabled?: boolean
  pkr_display_enabled?: boolean
}

interface PortfolioPoint {
  date: string
  date_label: string
  value: number
  profit: number
}

interface BenchmarkPoint {
  month: string
  month_key: string
  portfolio_roi: number
  market_roi: number
}

interface NextDistribution {
  progress_pct: number
  expected_date: string
  expected_date_label: string
  expected_payout: number
  label: string
}

interface DashboardPayload {
  user?: { id: number; name?: string; company_name?: string | null; avatar_url?: string | null }
  wallet?: { currency?: string; available_balance?: number }
  fx?: DashboardFx
  summary?: Partial<DashboardSummary>
  kyc_status?: string | null
  portfolio_series?: { points?: PortfolioPoint[] }
  benchmark_series?: { points?: BenchmarkPoint[] }
  benchmark_available?: boolean
  next_distribution?: NextDistribution | null
  next_distribution_available?: boolean
  profit_monthly?: Array<{ month: string; monthly: number }>
  allocation?: Array<{ name: string; value: number; color: string; amount?: number }>
  my_investments?: any[]
  recent_transactions?: any[]
  recent_deposits?: any[]
  withdrawals?: any[]
  opportunities?: any[]
  container_opportunities?: any[]
  module_opportunities?: any[]
  notifications?: any[]
  notifications_unread?: number
}

function EmptyState({ message = "Data not available" }: { message?: string }) {
  return (
    <div className="flex items-center justify-center py-10 px-4 text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function Sparkline({ data, color = "#16a34a" }: { data: number[]; color?: string }) {
  if (!data.length) {
    return <span className="text-[10px] text-muted-foreground">—</span>
  }
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 60, h = 24
  const pts = data.map((v, i) => {
    const x = data.length === 1 ? w / 2 : (i / (data.length - 1)) * w
    const y = h - ((v - min) / range) * h
    return `${x},${y}`
  }).join(" ")
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function CircleProgress({ pct, size = 52, stroke = 4, color = "#D4A012" }: { pct: number; size?: number; stroke?: number; color?: string }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(100, Math.max(0, pct)) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
    </svg>
  )
}

function rangeCutoff(range: RangeOption): Date | null {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (range === "7D") d.setDate(d.getDate() - 7)
  else if (range === "30D") d.setDate(d.getDate() - 30)
  else if (range === "90D") d.setDate(d.getDate() - 90)
  else if (range === "1Y") d.setFullYear(d.getFullYear() - 1)
  else return null
  return d
}

function filterPortfolioByRange(points: PortfolioPoint[], range: RangeOption): Array<{ date: string; value: number; profit: number }> {
  const cutoff = rangeCutoff(range)

  return points.flatMap(point => {
    if (!point.date) return []
    const date = new Date(point.date)
    if (Number.isNaN(date.getTime()) || (cutoff && date < cutoff)) return []

    const value = Number(point.value)
    const profit = Number(point.profit)
    if (point.value == null || point.profit == null || !Number.isFinite(value) || !Number.isFinite(profit)) {
      return []
    }

    return [{
      date: point.date_label || point.date,
      value,
      profit,
    }]
  })
}

function n(value: unknown): number {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

export default function InvestDashboard() {
  const [range, setRange] = useState<RangeOption>("30D")
  const [investmentTypeFilter, setInvestmentTypeFilter] = useState<InvestmentTypeFilter>("all")
  const [complianceModal, setComplianceModal] = useState<string | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const { user } = useLocalAuth()
  const [, setLocation] = useLocation()
  const c = useCurrency()
  const queryClient = useQueryClient()
  const [avatarSaving, setAvatarSaving] = useState(false)
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set())

  const { data: dashPayload, isLoading, isError } = useQuery({
    queryKey: INVESTOR_DASHBOARD_QUERY_KEY,
    queryFn: () => api.get<{ data: DashboardPayload }>("/api/investor/dashboard"),
  })

  const { data: opportunityProjects = [] } = useQuery({
    queryKey: ["investor", "projects", "dashboard-opportunities"],
    queryFn: () => fetchInvestorOpportunities("investor"),
  })

  const dash = dashPayload?.data
  const displayUsdRate = (() => {
    const rate = Number(dash?.fx?.display_usd_rate)
    return Number.isFinite(rate) && rate > 0 ? rate : null
  })()
  const summary: DashboardSummary = {
    total_investment: n(dash?.summary?.total_investment),
    active_investment: n(dash?.summary?.active_investment),
    total_investment_usd: n(dash?.summary?.total_investment_usd ?? dash?.summary?.total_investment),
    active_investment_usd: n(dash?.summary?.active_investment_usd ?? dash?.summary?.active_investment),
    active_investments_count: n(dash?.summary?.active_investments_count),
    investments_count: n(dash?.summary?.investments_count),
    available_balance: n(dash?.summary?.available_balance ?? dash?.wallet?.available_balance),
    total_profit_earned: n(dash?.summary?.total_profit_earned),
    total_profit_earned_usd: dash?.summary?.total_profit_earned_usd != null
      ? n(dash.summary.total_profit_earned_usd)
      : null,
    monthly_profit: n(dash?.summary?.monthly_profit),
    monthly_profit_usd: dash?.summary?.monthly_profit_usd != null
      ? n(dash.summary.monthly_profit_usd)
      : null,
    lifetime_roi: n(dash?.summary?.lifetime_roi),
    pending_withdrawals_amount: n(dash?.summary?.pending_withdrawals_amount),
    pending_withdrawals_amount_usd: dash?.summary?.pending_withdrawals_amount_usd != null
      ? n(dash.summary.pending_withdrawals_amount_usd)
      : null,
    pending_withdrawals_count: n(dash?.summary?.pending_withdrawals_count),
    pending_deposits_amount: n(dash?.summary?.pending_deposits_amount),
    pending_deposits_count: n(dash?.summary?.pending_deposits_count),
    total_deposits: n(dash?.summary?.total_deposits),
    total_deposits_count: n(dash?.summary?.total_deposits_count),
    total_deposits_usd: dash?.summary?.total_deposits_usd != null
      ? n(dash.summary.total_deposits_usd)
      : null,
    total_withdrawals: n(dash?.summary?.total_withdrawals),
    total_withdrawals_count: n(dash?.summary?.total_withdrawals_count),
    total_withdrawals_usd: dash?.summary?.total_withdrawals_usd != null
      ? n(dash.summary.total_withdrawals_usd)
      : null,
    completed_transactions: n(dash?.summary?.completed_transactions),
  }

  const portfolioPoints = dash?.portfolio_series?.points || []
  const chartData = useMemo(
    () => filterPortfolioByRange(portfolioPoints, range),
    [portfolioPoints, range],
  )
  const benchmarkPoints = dash?.benchmark_series?.points || []
  const nextDistribution = dash?.next_distribution_available ? dash.next_distribution : null
  const profitMonthly = dash?.profit_monthly || []
  const allocation = dash?.allocation || []
  const myInvestments = dash?.my_investments || []
  const filteredInvestments = useMemo(() => {
    if (investmentTypeFilter === "all") return myInvestments
    return myInvestments.filter((inv: any) => String(inv.project_type || "").toLowerCase() === investmentTypeFilter)
  }, [myInvestments, investmentTypeFilter])
  const transactions = dash?.recent_transactions || []
  const deposits = dash?.recent_deposits || []
  const withdrawals = dash?.withdrawals || []
  const featuredContainers = useMemo(
    () =>
      opportunityProjects
        .filter((p) => p.type === "container" && isContainerProjectInvestable(p.status))
        .slice(0, 3)
        .map(adminToContainer),
    [opportunityProjects],
  )

  const kycBadge = kycDashboardBadge(dash?.kyc_status)
  const ledgerCurrency = String(dash?.wallet?.currency ?? c.walletCurrency ?? "USD")
  const fmtW = (amount: number, usdAmount?: number | null, lockedRate?: number | null) =>
    formatInvestorLedgerAmount(c, amount, {
      usdAmount,
      ledgerCurrency,
      lockedRate: lockedRate ?? displayUsdRate,
    })
  const displayName = dash?.user?.name || user?.fullName || "Investor"
  const firstName = displayName.split(" ")[0] || "Investor"
  const companyLabel = dash?.user?.company_name || user?.companyName || "Investor Account"
  const avatarSrc = resolveMediaUrl(dash?.user?.avatar_url || user?.avatarUrl || "")

  async function handleAvatarFile(file?: File) {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      notify.error("Invalid file", "Choose an image file.")
      return
    }
    if (file.size > 2 * 1024 * 1024) { notify.error("File too large", "Photo must be under 2 MB."); return }
    setAvatarSaving(true)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("folder", "profile")
      const upload: any = await api.upload("/api/uploads", form)
      const uploadedPath = upload?.data?.path || upload?.data?.url || upload?.path || upload?.url
      const avatarPath = toStoredMediaPath(uploadedPath)
      if (!avatarPath) throw new Error("The uploaded photo path was not returned.")
      await api.put("/api/investor/profile", { avatar_url: avatarPath })
      await queryClient.invalidateQueries({ queryKey: ["investor", "dashboard"] })
      notify.success("Profile photo updated")
    } catch (error: any) {
      notify.error("Could not update profile photo", error?.message || "The investor service could not save this photo.")
    } finally {
      setAvatarSaving(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  function formatInvestmentTotal(walletAmount: number, usdAmount: number) {
    return formatInvestorLedgerAmount(c, walletAmount, {
      usdAmount,
      ledgerCurrency,
      lockedRate: displayUsdRate,
    })
  }

  const STAT_CARDS = [
    { label: "Total Deposits",         value: fmtW(summary.total_deposits, summary.total_deposits_usd),         change: `${summary.total_deposits_count} deposit${summary.total_deposits_count === 1 ? "" : "s"}`, up: true, icon: ArrowDownRight, color: "text-blue-500" },
    { label: "Pending Deposits",       value: fmtW(summary.pending_deposits_amount),    change: `${summary.pending_deposits_count}`, up: true, icon: AlertCircle,  color: "text-yellow-500"  },
    { label: "Total Withdrawals",      value: fmtW(summary.total_withdrawals, summary.total_withdrawals_usd),      change: `${summary.total_withdrawals_count} withdrawal${summary.total_withdrawals_count === 1 ? "" : "s"}`, up: true, icon: ArrowUpRight, color: "text-orange-500" },
    { label: "Pending Withdrawals",    value: fmtW(summary.pending_withdrawals_amount, summary.pending_withdrawals_amount_usd), change: `${summary.pending_withdrawals_count}`, up: true, icon: Clock,        color: "text-orange-500"  },
    { label: "Total Investment",       value: formatInvestmentTotal(summary.total_investment, summary.total_investment_usd),       change: `${summary.investments_count}`, up: summary.investments_count >= 0, icon: DollarSign,   color: "text-emerald-500" },
    { label: "Active Investment",      value: formatInvestmentTotal(summary.active_investment, summary.active_investment_usd),      change: `${summary.active_investments_count}`, up: true, icon: Activity,     color: "text-blue-500"    },
    { label: "Total Profit Earned",    value: fmtW(summary.total_profit_earned, summary.total_profit_earned_usd),    change: summary.total_profit_earned > 0 ? "+" : "0", up: summary.total_profit_earned >= 0, icon: TrendingUp,   color: "text-emerald-500" },
    { label: "Monthly Profit",         value: fmtW(summary.monthly_profit, summary.monthly_profit_usd),         change: summary.monthly_profit > 0 ? "+" : "0", up: summary.monthly_profit >= 0, icon: TrendingUp,   color: "text-emerald-500" },
    { label: "Lifetime ROI",           value: `${summary.lifetime_roi}%`,                         change: summary.lifetime_roi > 0 ? "+" : "0%", up: summary.lifetime_roi >= 0, icon: Activity, color: "text-accent" },
    { label: "Completed Transactions", value: String(summary.completed_transactions),             change: `${summary.completed_transactions}`, up: true, icon: CheckCircle2, color: "text-emerald-500" },
  ]

  const COMPLIANCE = [
    {
      key: "kyc",
      label: kycBadge.label.replace(/^✓\s*/, ""),
      status: kycBadge.approved ? "verified" : (dash?.kyc_status === "rejected" ? "rejected" : "pending"),
      icon: kycBadge.approved ? CheckCircle2 : AlertTriangle,
      color: kycBadge.approved
        ? "text-emerald-500"
        : dash?.kyc_status === "review" || dash?.kyc_status === "pending"
          ? "text-amber-500"
          : "text-red-600",
      bg: kycBadge.approved
        ? "bg-emerald-500/15"
        : dash?.kyc_status === "review" || dash?.kyc_status === "pending"
          ? "bg-amber-500/15"
          : "bg-red-600/15",
      detail: kycBadge.approved
        ? "Identity and business documents verified."
        : dash?.kyc_status === "review" || dash?.kyc_status === "pending"
          ? "Your documents are under compliance review."
          : dash?.kyc_status === "rejected"
            ? "KYC was rejected. Please re-upload required documents."
            : "Complete KYC verification to unlock full account features.",
    },
    {
      key: "aml",
      label: "AML Status",
      status: "pending",
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-500/15",
      detail: "Data not available",
    },
    {
      key: "tax",
      label: "Tax Documents",
      status: "pending",
      icon: AlertTriangle,
      color: "text-amber-500",
      bg: "bg-amber-500/15",
      detail: "Data not available",
    },
  ]

  return (
    <InvestPortalLayout title="Investment Dashboard" subtitle="Welcome back — your portfolio at a glance">
      <div className="space-y-8">
        <InvestorKycRequiredBanner />
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading your dashboard…
          </div>
        )}
        {isError && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600">
            Unable to load dashboard data. Amounts and lists will show empty values until the connection is restored.
          </div>
        )}

        {/* Welcome banner */}
        <div className="rounded-2xl bg-gradient-to-r from-primary via-primary/90 to-emerald-700 p-6 text-primary-foreground flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`relative shrink-0 group ${avatarSaving ? "cursor-wait" : "cursor-pointer"}`} onClick={() => !avatarSaving && avatarInputRef.current?.click()}>
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/10 flex items-center justify-center text-xl font-bold text-primary-foreground">
                {avatarSrc
                  ? <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                  : (firstName.slice(0, 2).toUpperCase() || "IN")
                }
              </div>
              <div className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={avatarSaving}
                onChange={e => {
                  const file = e.target.files?.[0]
                  e.target.value = ""
                  void handleAvatarFile(file)
                }}
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${kycBadge.className}`}>
                  {kycBadge.label}
                </span>
                <span className="text-sm font-medium text-primary-foreground/80">{companyLabel}</span>
              </div>
              <h2 className="text-2xl font-heading font-bold">Balance : {fmtW(summary.available_balance)}</h2>
              <p className="text-primary-foreground/70 text-sm">
                Your portfolio overview. Lifetime ROI:{" "}
                <strong className="text-accent">{summary.lifetime_roi}%</strong>
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/invest/deposit"
                  className="inline-flex items-center gap-2 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 text-xs font-medium transition-colors"
                >
                  <Clock className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    Pending Deposits:{" "}
                    <strong className="text-white">{fmtW(summary.pending_deposits_amount)}</strong>
                    {summary.pending_deposits_count > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold">
                        {summary.pending_deposits_count}
                      </span>
                    )}
                  </span>
                </Link>
                <span className="inline-flex items-center gap-2 rounded-lg bg-white/10 border border-white/20 px-3 py-1.5 text-xs font-medium">
                  <Activity className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    Active:{" "}
                    <strong className="text-white">{formatInvestmentTotal(summary.active_investment, summary.active_investment_usd)}</strong>
                    {summary.active_investments_count > 0 && (
                      <span className="ml-1.5 text-primary-foreground/70">({summary.active_investments_count})</span>
                    )}
                  </span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" size="sm" className="bg-white/15 hover:bg-white/25 text-white border-white/20" asChild>
              <Link href="/invest/deposit">Make Deposit</Link>
            </Button>
            <Button variant="secondary" size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90 border-0" asChild>
              <Link href="/invest/opportunities">Browse Investments</Link>
            </Button>
          </div>
        </div>

        {/* Next Distribution */}
        <Card className="glass-card border-accent/25" style={{ background: "linear-gradient(135deg, hsl(var(--card)) 0%, hsl(43 85% 47% / 0.06) 100%)" }}>
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-5">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative shrink-0">
                  <CircleProgress pct={nextDistribution?.progress_pct ?? 0} size={64} stroke={5} color="#D4A012" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-bold text-accent">{Math.round(nextDistribution?.progress_pct ?? 0)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-0.5">Next Distribution</p>
                  {nextDistribution ? (
                    <>
                      <p className="text-2xl font-heading font-bold">{nextDistribution.expected_date_label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expected payout:{" "}
                        <strong className="text-emerald-500">{fmtW(nextDistribution.expected_payout)}</strong>
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-heading font-bold text-muted-foreground">Data not available</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Expected payout: <strong className="text-emerald-500">{fmtW(0)}</strong>
                      </p>
                    </>
                  )}
                </div>
              </div>
              <div className="flex-1">
                {nextDistribution ? (
                  <p className="text-sm text-muted-foreground">
                    Upcoming settlement for <strong className="text-foreground">{nextDistribution.label}</strong>
                  </p>
                ) : (
                  <EmptyState message="No active investments with a scheduled distribution" />
                )}
              </div>
              <Badge className="bg-accent/15 text-amber-700 border-accent/20 text-xs font-semibold shrink-0 self-start sm:self-center">
                {nextDistribution ? "Cycle Distribution" : "Monthly Distribution"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Compliance Status Row */}
        <div className="grid sm:grid-cols-3 gap-4">
          {COMPLIANCE.map(item => (
            <button
              key={item.key}
              onClick={() => {
                if (item.key === "kyc") {
                  setLocation("/invest/kyc")
                  return
                }
                setComplianceModal(item.key)
              }}
              className={`flex items-center gap-3 p-4 rounded-xl border text-left w-full transition-all hover:scale-[1.02] ${item.bg} border-transparent hover:border-current/20`}
            >
              <item.icon className={`w-5 h-5 shrink-0 ${item.color}`} />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${item.color}`}>{item.label}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Click for details</p>
              </div>
              {item.status === "verified"
                ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                : <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
            </button>
          ))}
        </div>

        {complianceModal && (() => {
          const item = COMPLIANCE.find(cItem => cItem.key === complianceModal)!
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
              <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <item.icon className={`w-5 h-5 ${item.color}`} />
                    <h3 className="font-heading font-bold text-base">{item.label}</h3>
                  </div>
                  <button onClick={() => setComplianceModal(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.detail}</p>
                <Button size="sm" className="mt-4 w-full" onClick={() => setComplianceModal(null)}>Close</Button>
              </div>
            </div>
          )
        })()}

        {/* KPI grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {STAT_CARDS.map((s) => (
            <Card key={s.label} className="glass-card hover:border-accent/30 transition-colors">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
                  <s.icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div className="text-xl font-heading font-bold">{s.value}</div>
                <div className={`flex items-center gap-1 text-xs font-medium ${s.up ? "text-emerald-500" : "text-red-400"}`}>
                  {s.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {s.change}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Portfolio performance chart */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-heading text-lg">Portfolio Performance</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Total portfolio value over time</p>
            </div>
            <div className="flex gap-1 bg-muted/50 p-1 rounded-lg">
              {RANGE_OPTIONS.map(r => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${range === r ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {r}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis
                    width={72}
                    domain={[0, (max: number) => Math.max(max * 1.08, 1)]}
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={v => fmtW(v)}
                  />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(v: number, name: string) => [
                      fmtW(v),
                      name === "profit" ? "Cumulative Profit" : "Portfolio Value",
                    ]}
                  />
                  <Line type="stepAfter" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} name="value" dot={chartData.length === 1} />
                  <Line type="stepAfter" dataKey="profit" stroke="#D4A012" strokeWidth={2} fill="none" strokeDasharray="4 2" name="profit" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Portfolio vs Market Benchmark */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="font-heading text-lg">Portfolio vs Market Benchmark</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">12-month ROI comparison (%)</p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-emerald-500 rounded" />
                <span className="text-muted-foreground">My Portfolio</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 bg-blue-400 rounded" style={{ borderTop: "2px dashed" }} />
                <span className="text-muted-foreground">Market Avg</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!dash?.benchmark_available || benchmarkPoints.length === 0 ? (
              <EmptyState message="Complete an investment cycle to see ROI comparison" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={benchmarkPoints} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(v: number, name: string) => [`${Number(v).toFixed(2)}%`, name === "portfolio_roi" ? "My Portfolio" : "Market Avg"]}
                  />
                  <Line type="monotone" dataKey="portfolio_roi" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} name="portfolio_roi" />
                  <Line type="monotone" dataKey="market_roi" stroke="#60a5fa" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2 }} name="market_roi" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* New Investment Opportunities — open containers from Browse Opportunities */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-lg">New Investment Opportunities</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Open export container slots available now</p>
            </div>
            <Link href="/invest/opportunities">
              <Button size="sm" variant="outline">Browse All</Button>
            </Link>
          </div>
          {featuredContainers.length === 0 ? (
            <Card className="glass-card"><CardContent><EmptyState message="No open containers right now" /></CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-3 gap-6">
              {featuredContainers.map((c) => (
                <ContainerOpportunityCard
                  key={c.id}
                  container={c}
                  imageFailed={failedImages.has(c.id)}
                  onImageError={(id) => setFailedImages((prev) => new Set(prev).add(id))}
                />
              ))}
            </div>
          )}
        </div>

        {/* Profit analytics + allocation */}
        <div className="grid lg:grid-cols-3 gap-6">
          <Card className="glass-card lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Profit Analytics</CardTitle>
              <p className="text-xs text-muted-foreground">Monthly earnings breakdown</p>
            </CardHeader>
            <CardContent>
              {profitMonthly.length === 0 ? (
                <EmptyState />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={profitMonthly} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => fmtW(v)} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                      formatter={(v: number) => [fmtW(v), ""]}
                    />
                    <Bar dataKey="monthly" fill="hsl(var(--primary))" name="Monthly" radius={[3, 3, 0, 0]} />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="font-heading text-lg">Allocation</CardTitle>
              <p className="text-xs text-muted-foreground">Portfolio distribution</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {allocation.length === 0 ? (
                <EmptyState />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={allocation} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {allocation.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(v: number) => [`${v}%`, ""]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  {allocation.map(d => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: d.color }} />
                        <span className="text-foreground/80">{d.name}</span>
                      </div>
                      <span className="font-semibold">{d.value}%</span>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* My Investments */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <Ship className="w-4 h-4 text-primary" /> My Investments
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Containers, rice mill, feed mill and other positions — status &amp; projected returns</p>
            </div>
            <Button size="sm" asChild>
              <Link href="/invest/containers">View All Details</Link>
            </Button>
          </CardHeader>
          <div className="px-6 pb-3 flex flex-wrap gap-1.5">
            {INVESTMENT_TYPE_FILTERS.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => setInvestmentTypeFilter(f.id)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-colors ${
                  investmentTypeFilter === f.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <CardContent className="p-0">
            {filteredInvestments.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      {["Plan", "Category", "Type", "Route / Asset", "Status", "Term Progress", "Proj. Profit", "ROI", "Returns Trend"].map(h => (
                        <th key={h} className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvestments.map((inv: any) => {
                      const projectType = String(inv.project_type || "").toLowerCase()
                      const statusContext = {
                        projectType,
                        projectStatus: inv.project_status,
                      }
                      const rawInvestmentStatus = inv.investment_status ?? inv.status
                      const containerProjectLabel = projectType === "container"
                        ? containerProjectStatusLabel(inv.project_status)
                        : "—"
                      const statusLabel = projectType === "container" && containerProjectLabel !== "—"
                        ? containerProjectLabel
                        : investmentStatusLabel(rawInvestmentStatus, statusContext)
                      const meta = STATUS_META[inv.status] ?? {
                        label: statusLabel,
                        color: investmentStatusBadgeClass(rawInvestmentStatus, statusContext),
                        dot: "bg-muted-foreground",
                      }
                      const displayMeta = projectType === "container" && containerProjectLabel !== "—"
                        ? (STATUS_META[inv.status] ?? {
                          label: containerProjectLabel,
                          color: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
                          dot: "bg-amber-500",
                        })
                        : { ...meta, label: statusLabel }
                      const isImport = inv.type === "import"
                      const isProject = inv.type === "project"
                      const totalDays = n(inv.total_days)
                      const daysElapsed = n(inv.days_elapsed)
                      const termPct = totalDays > 0 ? Math.min(100, Math.round((daysElapsed / totalDays) * 100)) : 0
                      const expectedProfit = n(inv.expected_profit)
                      const actualProfit = inv.profit_amount != null ? n(inv.profit_amount) : null
                      const projProfit = inv.status === "completed" && actualProfit != null
                        ? actualProfit
                        : inv.status === "completed"
                          ? expectedProfit
                          : totalDays > 0
                            ? Math.round(expectedProfit * (daysElapsed / totalDays))
                            : 0
                      const pol = String(inv.port_of_loading || inv.commodity || "—").split(",")[0]
                      const pod = String(inv.port_of_discharge || inv.current_stage || "—").split(",")[0]
                      return (
                        <tr key={inv.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="py-3 px-4 font-semibold text-foreground whitespace-nowrap">{inv.plan || "—"}</td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-[10px] font-medium capitalize">
                              {projectTypeLabel(projectType)}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`text-[10px] font-bold border-0 ${
                              isImport  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              : isProject ? "bg-accent/15 text-amber-700 dark:text-amber-400"
                              : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            }`}>
                              {isProject ? "Project" : isImport ? "↓ Import" : "↑ Export"}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                            {(() => {
                              const label = formatContainerLabel(inv.container_no, inv.container_type)
                              return label !== "—" ? label : (inv.commodity || "—")
                            })()}
                          </td>
                          <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
                            {pol} → {pod}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={`text-[10px] border-0 flex items-center gap-1 w-fit ${displayMeta.color}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${displayMeta.dot}`} />{displayMeta.label}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div className="relative shrink-0">
                                <CircleProgress
                                  pct={termPct}
                                  size={36}
                                  stroke={3}
                                  color={inv.status === "completed" ? "#16a34a" : "#D4A012"}
                                />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="text-[8px] font-bold">{termPct}%</span>
                                </div>
                              </div>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {totalDays > 0 ? `${daysElapsed}/${totalDays}d` : "—"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-emerald-500 whitespace-nowrap">
                            +{c.fmtDual(
                              projProfit,
                              inv.profit_amount_pkr != null && inv.status === "completed"
                                ? n(inv.profit_amount_pkr)
                                : inv.amount_pkr != null && expectedProfit > 0
                                  ? Math.round(n(inv.amount_pkr) * (projProfit / expectedProfit) * 100) / 100
                                  : null,
                              inv.exchange_rate != null ? n(inv.exchange_rate) : null,
                            )}
                            <span className="text-[10px] text-muted-foreground ml-1">
                              / {c.fmtDual(
                                expectedProfit,
                                inv.profit_amount_pkr != null
                                  ? n(inv.profit_amount_pkr)
                                  : inv.amount_pkr != null
                                    ? Math.round(n(inv.amount_pkr) * (n(inv.roi) / 100) * 100) / 100
                                    : null,
                                inv.exchange_rate != null ? n(inv.exchange_rate) : null,
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-bold text-primary">{n(inv.roi)}%</td>
                          <td className="py-3 px-4">
                            <Sparkline
                              data={Array.isArray(inv.historical_returns) ? inv.historical_returns.map(n) : []}
                              color={inv.status === "completed" ? "#6b7280" : "#16a34a"}
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Deposits + Withdrawal History */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading text-lg">Recent Deposits</CardTitle>
                <p className="text-xs text-muted-foreground">Last 5 deposits including pending</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/invest/deposit">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {deposits.length === 0 ? (
                <EmptyState message="No deposits yet" />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Date", "Reference", "Amount", "Method", "Status"].map(h => (
                        <th key={h} className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {deposits.map((d: any) => (
                      <tr
                        key={d.id}
                        role="link"
                        tabIndex={/^\d+$/.test(String(d.id ?? "")) ? 0 : -1}
                        aria-label={`Open deposit details ${d.reference || d.id || ""}`}
                        onClick={() => /^\d+$/.test(String(d.id ?? "")) && setLocation(`/invest/transactions/deposit/${d.id}`)}
                        onKeyDown={event => {
                          if ((event.key === "Enter" || event.key === " ") && /^\d+$/.test(String(d.id ?? ""))) {
                            event.preventDefault()
                            setLocation(`/invest/transactions/deposit/${d.id}`)
                          }
                        }}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{d.date_label || d.date || "—"}</td>
                        <td className="py-3 px-4 font-mono text-xs font-semibold text-foreground">{d.reference || "—"}</td>
                        <td className="py-3 px-4 font-bold text-emerald-500">
                          {(() => {
                            const walletAmt = Math.abs(n(d.amount))
                            const originalAmt = Math.abs(n(d.original_amount ?? d.amount))
                            const originalCur = String(d.original_currency || d.currency || "").toUpperCase()
                            const walletCur = String(d.wallet_currency || d.currency || "").toUpperCase()
                            const amountUsd = d.amount_usd != null
                              ? n(d.amount_usd)
                              : (originalCur === "USD" ? originalAmt : null)
                            const lockedRate = d.usd_exchange_rate != null
                              ? n(d.usd_exchange_rate)
                              : (d.exchange_rate != null ? n(d.exchange_rate) : null)
                            if (walletCur === "PKR" && amountUsd != null && amountUsd > 0) {
                              return fmtW(walletAmt, amountUsd, lockedRate)
                            }
                            return fmtW(walletAmt, null, lockedRate)
                          })()}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{d.method || "—"}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-[10px] capitalize border-0 ${paymentStatusBadgeClass(d.status)}`}>
                            {paymentStatusLabel(d.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading text-lg">Withdrawal History</CardTitle>
                <p className="text-xs text-muted-foreground">Last 5 withdrawals</p>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/invest/withdraw">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {withdrawals.length === 0 ? (
                <EmptyState />
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Date", "Amount", "Bank", "Status"].map(h => (
                        <th key={h} className="text-left py-2.5 px-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {withdrawals.map((w: any) => (
                      <tr
                        key={w.id}
                        role="link"
                        tabIndex={/^\d+$/.test(String(w.id ?? "")) ? 0 : -1}
                        aria-label={`Open withdrawal details ${w.reference || w.id || ""}`}
                        onClick={() => /^\d+$/.test(String(w.id ?? "")) && setLocation(`/invest/transactions/withdrawal/${w.id}`)}
                        onKeyDown={event => {
                          if ((event.key === "Enter" || event.key === " ") && /^\d+$/.test(String(w.id ?? ""))) {
                            event.preventDefault()
                            setLocation(`/invest/transactions/withdrawal/${w.id}`)
                          }
                        }}
                        className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                      >
                        <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">{w.date_label || w.date || "—"}</td>
                        <td className="py-3 px-4 font-bold text-red-400">
                          {fmtW(
                            Math.abs(n(w.amount)),
                            w.amount_usd != null ? n(w.amount_usd) : null,
                            w.exchange_rate != null ? n(w.exchange_rate) : null,
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{w.bank || "—"}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-[10px] capitalize border-0 ${paymentStatusBadgeClass(w.status)}`}>
                            {paymentStatusLabel(w.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Transactions + Notifications */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-heading text-lg">Recent Transactions</CardTitle>
                <p className="text-xs text-muted-foreground">Deposits, withdrawals, profits and adjustments</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href="/invest/reports">Export CSV</Link>
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href="/invest/reports">Export PDF</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <EmptyState />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        {["Date", "Reference", "Type", "Method", "Amount", "Status", "Remarks"].map(h => (
                          <th key={h} className="text-left py-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx: any) => {
                        const isOut = tx.type === "Withdrawal" || tx.direction === "debit"
                        const ref = String(tx.reference || "")
                        const displayRef = /^INV-\d+$/i.test(ref) ? ref.replace(/^INV-/i, "") : ref
                        return (
                          <tr
                            key={tx.id || tx.reference}
                            role="link"
                            tabIndex={/^\d+$/.test(String(tx.id ?? "")) ? 0 : -1}
                            aria-label={`Open transaction details ${displayRef}`}
                            onClick={() => /^\d+$/.test(String(tx.id ?? "")) && setLocation(`/invest/transactions/wallet/${tx.id}`)}
                            onKeyDown={event => {
                              if ((event.key === "Enter" || event.key === " ") && /^\d+$/.test(String(tx.id ?? ""))) {
                                event.preventDefault()
                                setLocation(`/invest/transactions/wallet/${tx.id}`)
                              }
                            }}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                          >
                            <td className="py-3 px-3 text-muted-foreground whitespace-nowrap">{tx.date_label || tx.date || "—"}</td>
                            <td className="py-3 px-3 font-mono text-xs font-bold text-foreground">{displayRef || "—"}</td>
                            <td className={`py-3 px-3 font-semibold ${TXN_COLORS[tx.type] || ""}`}>{tx.type || "—"}</td>
                            <td className="py-3 px-3 text-muted-foreground">{tx.method || "—"}</td>
                            <td className={`py-3 px-3 font-bold ${isOut ? "text-red-400" : "text-emerald-500"}`}>
                              {fmtW(Math.abs(n(tx.amount)))}
                            </td>
                            <td className="py-3 px-3">
                              <Badge className={`text-[10px] capitalize border-0 ${paymentStatusBadgeClass(tx.status)}`}>
                                {paymentStatusLabel(tx.status)}
                              </Badge>
                            </td>
                            <td className="py-3 px-3 text-muted-foreground text-xs">{tx.remark || "—"}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <RecentAlertsCard
            apiBase="/api/investor/notifications"
            listHref="/invest/notifications"
            limit={5}
          />
        </div>
      </div>
    </InvestPortalLayout>
  )
}
