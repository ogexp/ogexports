import { useState } from "react"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from "recharts"
import {
  TrendingUp, TrendingDown, DollarSign, Calendar, AlertCircle,
  ArrowUpRight, ArrowDownRight, Package, Wheat, Info,
  ShieldAlert, Scale, FileText, ChevronRight, BarChart3, Minus
} from "lucide-react"
import { InvestNowModal } from "@/components/invest/InvestNowModal"
import type { LongTermProject } from "@/data/investments"
import { useLocalAuth } from "@/lib/local-auth"
import { useToast } from "@/hooks/use-toast"

const TRADING_STATS = [
  { label: "Active Commodity Pools", value: "5",     change: "Across 3 sectors",   icon: Package,    color: "text-emerald-500" },
  { label: "Avg. Monthly Return",    value: "3.1%",  change: "Last 6 months avg",  icon: TrendingUp, color: "text-accent"      },
  { label: "Max Drawdown (12 mo)",   value: "-4.8%", change: "Worst single month", icon: ShieldAlert,color: "text-amber-500"   },
  { label: "Total Pool Capital",     value: "$180K", change: "Across all pools",   icon: DollarSign, color: "text-blue-500"    },
]

const COMMODITIES = [
  {
    id: "POOL-DTR-001",
    name: "Basmati & Super Kernel Rice",
    icon: "🌾",
    sector: "Grains",
    minInvestment: "$500",
    maxInvestment: "$25,000",
    currentReturn: "+3.4%",
    positive: true,
    strategy: "Buy-sell arbitrage between mandi (wholesale market) and rice mills across Central Punjab.",
    cycle: "Monthly",
    riskLevel: "Medium",
    riskColor: "text-amber-500",
    profitShare: "75% investor / 25% operator",
    openForInvestment: true,
  },
  {
    id: "POOL-DTR-002",
    name: "Wheat & Flour Commodity",
    icon: "🌿",
    sector: "Staples",
    minInvestment: "$300",
    maxInvestment: "$20,000",
    currentReturn: "+2.1%",
    positive: true,
    strategy: "Seasonal storage and price-differential trading of wheat across Punjab mandis and flour mills.",
    cycle: "Monthly",
    riskLevel: "Low–Medium",
    riskColor: "text-green-500",
    profitShare: "75% investor / 25% operator",
    openForInvestment: true,
  },
  {
    id: "POOL-DTR-003",
    name: "Potato (Fresh & Processing Grade)",
    icon: "🥔",
    sector: "Vegetables",
    minInvestment: "$500",
    maxInvestment: "$30,000",
    currentReturn: "-1.2%",
    positive: false,
    strategy: "Buy-in at harvest (Oct–Dec), store in cold facility, sell in off-season (Mar–Jun) at premium prices.",
    cycle: "Monthly",
    riskLevel: "Medium–High",
    riskColor: "text-amber-600",
    profitShare: "72% investor / 28% operator",
    openForInvestment: true,
  },
  {
    id: "POOL-DTR-004",
    name: "Onion & Garlic Seasonal",
    icon: "🧅",
    sector: "Vegetables",
    minInvestment: "$300",
    maxInvestment: "$15,000",
    currentReturn: "+4.8%",
    positive: true,
    strategy: "Procurement from Badin & Khairpur at harvest lows, stored for peak-demand sale in domestic markets.",
    cycle: "Monthly",
    riskLevel: "Medium",
    riskColor: "text-amber-500",
    profitShare: "75% investor / 25% operator",
    openForInvestment: true,
  },
  {
    id: "POOL-DTR-005",
    name: "Maize & Feed Corn",
    icon: "🌽",
    sector: "Feed Crops",
    minInvestment: "$500",
    maxInvestment: "$20,000",
    currentReturn: "+2.6%",
    positive: true,
    strategy: "Mandi-to-feed-mill arbitrage. High-volume, low-margin trades across KPK and Punjab livestock belt.",
    cycle: "Monthly",
    riskLevel: "Low–Medium",
    riskColor: "text-green-500",
    profitShare: "75% investor / 25% operator",
    openForInvestment: false,
  },
  {
    id: "POOL-DTR-006",
    name: "Rice Paddy (Raw & Husked)",
    icon: "🌾",
    sector: "Grains",
    minInvestment: "$400",
    maxInvestment: "$25,000",
    currentReturn: "+3.8%",
    positive: true,
    strategy: "Buy raw paddy at harvest (Oct–Dec) from Sheikhupura, Gujranwala & Narowal. Sell husked/milled paddy to rice mills and domestic dealers during off-season demand peaks.",
    cycle: "Monthly",
    riskLevel: "Medium",
    riskColor: "text-amber-500",
    profitShare: "75% investor / 25% operator",
    openForInvestment: true,
  },
]

const MONTHLY_PNL = [
  { month: "Aug '25",  rice: 3.1,  wheat: 2.4,  potato: -0.8, onion: 3.2, maize: 1.9, paddy: 1.4  },
  { month: "Sep '25",  rice: 2.8,  wheat: 1.9,  potato: -4.8, onion: 2.8, maize: 2.1, paddy: 0.8  },
  { month: "Oct '25",  rice: 4.2,  wheat: 2.6,  potato: -1.2, onion: 5.1, maize: 2.8, paddy: -1.2 },
  { month: "Nov '25",  rice: 3.8,  wheat: 3.1,  potato: 0.4,  onion: 4.6, maize: 1.7, paddy: -0.6 },
  { month: "Dec '25",  rice: 2.1,  wheat: 2.8,  potato: 1.8,  onion: 3.9, maize: 2.5, paddy: 0.4  },
  { month: "Jan '26",  rice: 3.5,  wheat: 1.4,  potato: 2.4,  onion: 4.1, maize: 3.1, paddy: 2.1  },
  { month: "Feb '26",  rice: 4.1,  wheat: 2.2,  potato: 3.6,  onion: 5.8, maize: 2.4, paddy: 3.4  },
  { month: "Mar '26",  rice: 3.6,  wheat: 2.9,  potato: 4.2,  onion: 6.2, maize: 2.8, paddy: 4.8  },
  { month: "Apr '26",  rice: 2.9,  wheat: 1.8,  potato: 3.8,  onion: 3.4, maize: 1.9, paddy: 5.2  },
  { month: "May '26",  rice: 3.2,  wheat: 2.1,  potato: 2.1,  onion: 2.8, maize: 2.6, paddy: 4.1  },
  { month: "Jun '26",  rice: 4.4,  wheat: 3.4,  potato: 1.4,  onion: 3.1, maize: 3.0, paddy: 3.6  },
  { month: "Jul '26",  rice: 3.4,  wheat: 2.1,  potato: -1.2, onion: 4.8, maize: 2.6, paddy: 3.8  },
]

const COMBINED_PNL = MONTHLY_PNL.map(m => ({
  month: m.month,
  combined: +((m.rice + m.wheat + m.potato + m.onion + m.maize + m.paddy) / 6).toFixed(2),
}))

const RISK_FACTORS = [
  { title: "Price Volatility",       desc: "Agricultural commodity prices fluctuate based on weather, government policy, imports/exports, and seasonal cycles." },
  { title: "Mandi & Market Liquidity",desc: "Local wholesale market liquidity varies. Large positions may be difficult to exit at expected prices in thin markets." },
  { title: "Storage & Spoilage",     desc: "Fresh produce carries spoilage risk. Quality deterioration can reduce realizable values below procurement cost." },
  { title: "Regulatory Intervention",desc: "Government price controls, export bans, or mandi regulations can materially affect trade margins." },
  { title: "Operator Execution Risk",desc: "Returns depend on the skill of OG Exports' trading desk. Poor execution may result in losses even in favorable markets." },
  { title: "Currency & Inflation",   desc: "PKR currency risk and domestic inflation may erode real returns for USD-denominated investors." },
]

const RISK_LEVELS: Record<string, { bg: string; text: string }> = {
  "Low–Medium":    { bg: "bg-green-500/15",  text: "text-green-600"  },
  "Medium":        { bg: "bg-amber-500/15",  text: "text-amber-600"  },
  "Medium–High":   { bg: "bg-orange-500/15", text: "text-orange-600" },
  "High":          { bg: "bg-red-500/15",    text: "text-red-500"    },
}

export default function InvestDomesticTrading() {
  const [activeTab, setActiveTab] = useState<"overview" | "pools" | "pnl" | "risks">("overview")
  const { toast } = useToast()
  const { user: localUser } = useLocalAuth()
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<LongTermProject | null>(null)

  function buildProjectFromPool(c: typeof COMMODITIES[0]): LongTermProject {
    const min = parseInt(c.minInvestment.replace(/[^0-9]/g, ""), 10)
    const max = parseInt(c.maxInvestment.replace(/[^0-9]/g, ""), 10)
    const roi = parseFloat(c.currentReturn.replace(/[^0-9.]/g, "")) || 3
    return {
      id: c.id, slug: c.id.toLowerCase(), name: c.name,
      category: "infrastructure",
      shortDescription: c.strategy, fullDescription: c.strategy,
      fundingTarget: max, currentFunding: Math.round(max * 0.5),
      minInvestment: min, maxInvestment: max,
      investmentPeriodMonths: 1, expectedReturnPct: roi,
      expectedCompletionDate: "2027-01-01",
      riskLevel: "medium", status: "open",
      totalInvestors: 0, imageUrls: [], highlights: [], documents: [],
    }
  }

  function openInvestModal(c: typeof COMMODITIES[0]) {
    if (!localUser) {
      toast({ title: "Login Required", description: "Please sign in with an investor account.", variant: "destructive" })
      return
    }
    if (localUser.accountType !== "investor") {
      toast({ title: "Investor Account Required", description: "Please switch to an investor account.", variant: "destructive" })
      return
    }
    setSelectedProject(buildProjectFromPool(c))
    setModalOpen(true)
  }

  return (
    <>
    <InvestPortalLayout title="Domestic Agro Commodities Trading" subtitle="Monthly profit & loss — short-cycle agro commodity pools">
      <div className="space-y-8">

        {/* Category badge */}
        <div className="flex items-center gap-3 flex-wrap">
          <Badge className="bg-amber-500/15 text-amber-700 border-0 text-xs flex items-center gap-1.5">
            <Wheat className="w-3 h-3" /> Domestic Trading
          </Badge>
          <Badge className="bg-blue-500/15 text-blue-600 border-0 text-xs">Monthly P&L</Badge>
          <Badge className="bg-red-500/15 text-red-500 border-0 text-xs flex items-center gap-1.5">
            <ShieldAlert className="w-3 h-3" /> Risk: Medium–High
          </Badge>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {TRADING_STATS.map(s => (
            <Card key={s.label} className="glass-card hover:border-accent/30 transition-colors">
              <CardContent className="p-5">
                <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
                <p className="text-2xl font-heading font-bold">{s.value}</p>
                <p className="text-xs font-semibold text-foreground mt-1">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl w-fit">
          {[
            { key: "overview", label: "Overview" },
            { key: "pools",    label: "Commodity Pools" },
            { key: "pnl",      label: "Monthly P&L" },
            { key: "risks",    label: "Risk Disclosures" },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === tab.key ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Model explanation */}
            <div className="grid lg:grid-cols-2 gap-5">
              <Card className="glass-card">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-heading font-bold text-base flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-accent" /> The Trading Model
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    OG Exports operates pooled capital in domestic agricultural commodity markets —
                    buying at harvest lows (when supply is high) and selling at seasonal demand peaks.
                    Investors participate in the net profit or loss of each pool on a monthly basis.
                  </p>
                  <div className="space-y-3 pt-2">
                    {[
                      { step: "Pooling", desc: "Investor capital is pooled per commodity with a defined max pool size." },
                      { step: "Procurement", desc: "Trading desk buys at mandi/farm level at optimal entry prices." },
                      { step: "Storage & Timing", desc: "Produce stored (cold or ambient) and sold at peak price windows." },
                      { step: "Monthly Settlement", desc: "Net P&L (profit or loss) distributed to each investor proportionally every month." },
                    ].map((s, i) => (
                      <div key={s.step} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-bold text-primary">{i + 1}</div>
                        <div>
                          <span className="text-sm font-semibold">{s.step}: </span>
                          <span className="text-sm text-muted-foreground">{s.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Combined portfolio P&L */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="font-heading text-base">Combined Portfolio — Monthly Returns</CardTitle>
                  <p className="text-xs text-muted-foreground">Average across all 5 commodity pools (12 months)</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={COMBINED_PNL} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number) => [`${v}%`, "Avg Return"]} />
                      <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1.5} />
                      {COMBINED_PNL.map((entry, i) => null)}
                      <Bar dataKey="combined" name="Avg Return" radius={[3,3,0,0]}
                        fill="#16a34a"
                        label={false}
                      >
                        {COMBINED_PNL.map((entry, i) => (
                          <rect key={i} fill={entry.combined >= 0 ? "#16a34a" : "#f87171"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Key facts */}
            <div className="grid sm:grid-cols-4 gap-4">
              {[
                { label: "Investment Model",   value: "Pooled Capital",       icon: Scale    },
                { label: "Profit Cycle",       value: "Monthly Settlement",   icon: Calendar },
                { label: "Loss Possibility",   value: "Yes — disclosed",      icon: TrendingDown },
                { label: "Min. Entry",         value: "From $300",            icon: DollarSign },
              ].map(f => (
                <Card key={f.label} className="glass-card">
                  <CardContent className="p-4 flex items-center gap-3">
                    <f.icon className="w-5 h-5 text-accent shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{f.label}</p>
                      <p className="text-sm font-bold">{f.value}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Commodity Pools */}
        {activeTab === "pools" && (
          <div className="space-y-4">
            {COMMODITIES.map(c => {
              const riskStyle = RISK_LEVELS[c.riskLevel] ?? RISK_LEVELS["Medium"]
              return (
                <Card key={c.id} className={`glass-card hover:border-accent/30 transition-all ${!c.openForInvestment ? "opacity-70" : ""}`}>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <span className="text-4xl shrink-0">{c.icon}</span>
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-bold text-base">{c.name}</h3>
                              <Badge className="text-[10px] border-0 bg-muted text-muted-foreground">{c.sector}</Badge>
                              {!c.openForInvestment && <Badge className="text-[10px] border-0 bg-muted text-muted-foreground">Pool Full</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{c.strategy}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">This Month</p>
                            <p className={`text-xl font-heading font-bold flex items-center gap-1 justify-end ${c.positive ? "text-emerald-500" : "text-red-400"}`}>
                              {c.positive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                              {c.currentReturn}
                            </p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="p-3 rounded-lg bg-muted/40">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Min Entry</p>
                            <p className="text-sm font-bold">{c.minInvestment}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/40">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Max Entry</p>
                            <p className="text-sm font-bold">{c.maxInvestment}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/40">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Profit Share</p>
                            <p className="text-sm font-bold">{c.profitShare.split(" / ")[0]}</p>
                          </div>
                          <div className="p-3 rounded-lg bg-muted/40">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Risk Level</p>
                            <p className={`text-sm font-bold ${riskStyle.text}`}>{c.riskLevel}</p>
                          </div>
                        </div>
                        {c.openForInvestment && (
                          <Button size="sm" className="w-full sm:w-auto"
                            onClick={() => openInvestModal(c)}>
                            Join Pool
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Monthly P&L */}
        {activeTab === "pnl" && (
          <div className="space-y-5">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg">Monthly Returns by Commodity (12 months)</CardTitle>
                <p className="text-xs text-muted-foreground">% monthly return per pool — negative months indicate losses</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={MONTHLY_PNL} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      {["#f59e0b","#16a34a","#3b82f6","#f97316","#8b5cf6"].map((color, i) => (
                        <linearGradient key={i} id={`g${i}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={color} stopOpacity={0.15} />
                          <stop offset="95%" stopColor={color} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "11px" }} formatter={(v: number) => [`${v}%`, ""]} />
                    <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="4 2" strokeWidth={1} />
                    <Area type="monotone" dataKey="rice"   name="🌾 Rice"        stroke="#f59e0b" fill="url(#g0)" strokeWidth={2} />
                    <Area type="monotone" dataKey="paddy"  name="🌾 Rice Paddy"  stroke="#d97706" fill="url(#g5)" strokeWidth={2} strokeDasharray="4 2" />
                    <Area type="monotone" dataKey="wheat"  name="🌿 Wheat"        stroke="#16a34a" fill="url(#g1)" strokeWidth={2} />
                    <Area type="monotone" dataKey="potato" name="🥔 Potato"       stroke="#3b82f6" fill="url(#g2)" strokeWidth={2} />
                    <Area type="monotone" dataKey="onion"  name="🧅 Onion"        stroke="#f97316" fill="url(#g3)" strokeWidth={2} />
                    <Area type="monotone" dataKey="maize"  name="🌽 Maize"        stroke="#8b5cf6" fill="url(#g4)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* P&L Summary Table */}
            <Card className="glass-card overflow-hidden">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Month</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">🌾 Rice</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">🌾 Paddy</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">🌿 Wheat</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">🥔 Potato</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">🧅 Onion</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">🌽 Maize</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {MONTHLY_PNL.map(row => (
                        <tr key={row.month} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3 font-medium text-xs">{row.month}</td>
                          {[row.rice, row.paddy, row.wheat, row.potato, row.onion, row.maize].map((v, i) => (
                            <td key={i} className={`px-4 py-3 text-right text-xs font-mono font-semibold ${v > 0 ? "text-emerald-500" : v < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                              {v > 0 ? "+" : ""}{v.toFixed(1)}%
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Risk Disclosures */}
        {activeTab === "risks" && (
          <div className="space-y-5">
            {/* High-visibility banner */}
            <Card className="glass-card border-red-500/30 bg-red-500/5 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-lg text-red-600 mb-1">High-Risk Investment Category</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Domestic agro commodity trading involves <strong>significant financial risk</strong>. Unlike fixed-yield instruments,
                      monthly returns are <strong>not guaranteed</strong> and losses are possible in any given month. You may receive back
                      less than your invested capital. Read all risk disclosures carefully before investing.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Individual risk factors */}
            <div className="grid md:grid-cols-2 gap-4">
              {RISK_FACTORS.map(r => (
                <Card key={r.title} className="glass-card">
                  <CardContent className="p-5 flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold mb-1">{r.title}</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Full legal disclaimer */}
            <Card className="glass-card border-amber-500/20 bg-amber-500/3">
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  <FileText className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <h4 className="font-heading font-bold text-base">Full Risk Disclosure — Domestic Agro Commodities Trading</h4>
                </div>
                <div className="space-y-3 text-xs text-muted-foreground leading-relaxed">
                  <p><strong className="text-foreground">1. Nature of Investment:</strong> Participation in OG Exports' domestic agro commodity trading pools constitutes a high-risk, speculative investment. Monthly returns are variable and directly tied to commodity price movements, which are inherently unpredictable.</p>
                  <p><strong className="text-foreground">2. Capital at Risk:</strong> You may lose part or all of your invested capital. Past performance, including historical monthly returns displayed on this platform, is not indicative of future results. Months with positive returns do not guarantee future positive months.</p>
                  <p><strong className="text-foreground">3. No Guaranteed Return:</strong> Unlike fixed-deposit instruments, there is no guaranteed annual or monthly yield. Returns depend entirely on successful commodity trading outcomes. Losses incurred in any pool are borne proportionally by all investors in that pool.</p>
                  <p><strong className="text-foreground">4. Commodity Price Risk:</strong> Agricultural commodity prices are subject to volatility driven by weather events (floods, droughts), government price support mechanisms, import/export policies, and global supply-demand imbalances. These factors are outside OG Exports' control.</p>
                  <p><strong className="text-foreground">5. Spoilage & Quality Risk:</strong> Fresh produce has a limited shelf life. Unforeseen spoilage, contamination, or quality degradation may result in total or partial loss of the commodity value and investment capital.</p>
                  <p><strong className="text-foreground">6. Liquidity Risk:</strong> Investments in active trading pools may not be redeemable before the end of the monthly cycle. Emergency redemption requests are subject to pool liquidity and may not always be honoured.</p>
                  <p><strong className="text-foreground">7. Operator Risk:</strong> The performance of each pool is dependent on the trading decisions of OG Exports' commodity desk. Human error, misjudgement of market conditions, or operational failures may result in underperformance or loss.</p>
                  <p><strong className="text-foreground">8. Regulatory Risk:</strong> The Government of Pakistan periodically intervenes in agricultural markets through price floors/ceilings, subsidies, and export restrictions. Such interventions may adversely affect pool profitability.</p>
                  <p><strong className="text-foreground">9. Not Regulated Financial Advice:</strong> Nothing on this platform constitutes investment advice, a financial recommendation, or a solicitation to invest. OG Exports is not a licensed investment advisor. Investors should seek independent professional financial, legal, and tax advice before committing any capital.</p>
                  <p><strong className="text-foreground">10. Profit Share:</strong> Net profits are shared 72–75% to investors and 25–28% to OG Exports as operator fees, after deduction of all direct costs (storage, transport, handling, spoilage). Loss months result in proportional capital reduction; no operator fee is charged in loss months.</p>
                </div>
                <div className="mt-5 p-4 rounded-xl border border-red-500/20 bg-red-500/8 text-xs text-red-500 font-semibold">
                  ⚠ By investing in any domestic trading pool, you confirm that you have read, understood, and accepted all risks outlined in this disclosure. Investment is suitable only for persons who can afford to lose the full amount invested.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </InvestPortalLayout>

    {selectedProject && (
      <InvestNowModal
        investment={selectedProject}
        initialAmount={selectedProject.minInvestment}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    )}
    </>
  )
}
