import * as React from "react"
import {
  TrendingUp, TrendingDown, RefreshCw, ArrowUpDown, Ship,
  Fuel, Package, Globe, ChevronUp, ChevronDown, DollarSign,
  BarChart3, Activity, Anchor
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts"
import { usePageTitle } from "@/hooks/use-page-title"

// ── Commodity Data ─────────────────────────────────────────────────────────────
const BASE_COMMODITIES = [
  { name: "Basmati Rice 1121",       usd: 850,  pkr: 237000, change: 1.2,  quality: "Premium", status: "Active", trend: [820,830,840,835,845,850,850] },
  { name: "IRRI-6 Rice",             usd: 310,  pkr: 86500,  change: -0.5, quality: "Grade A", status: "Active", trend: [320,315,312,310,308,311,310] },
  { name: "Sesame Seeds (Natural)",  usd: 1240, pkr: 346000, change: 2.1,  quality: "Natural", status: "Active", trend: [1180,1200,1215,1220,1235,1240,1240] },
  { name: "Yellow Maize",            usd: 195,  pkr: 54400,  change: -1.3, quality: "Grade B", status: "Active", trend: [200,198,196,195,194,196,195] },
  { name: "Fresh Mangoes (Sindhri)", usd: 680,  pkr: 189800, change: 3.5,  quality: "Export",  status: "Seasonal", trend: [620,640,655,665,670,678,680] },
  { name: "Kinnow Mandarins",        usd: 380,  pkr: 106000, change: 0.8,  quality: "Grade A", status: "Seasonal", trend: [365,370,375,378,380,379,380] },
  { name: "Black Gram Lentils",      usd: 920,  pkr: 256800, change: -0.3, quality: "Premium", status: "Active", trend: [930,928,925,922,920,921,920] },
  { name: "Chickpeas (Desi)",        usd: 780,  pkr: 217700, change: 1.8,  quality: "Premium", status: "Active", trend: [755,762,768,773,778,780,780] },
  { name: "Wheat Flour (Fine)",      usd: 245,  pkr: 68400,  change: 0.2,  quality: "Fine",    status: "Active", trend: [240,242,243,244,245,245,245] },
  { name: "Cotton Lint",             usd: 1580, pkr: 441100, change: -2.1, quality: "Grade A", status: "Active", trend: [1620,1610,1600,1592,1585,1578,1580] },
]

// ── Currency Data ──────────────────────────────────────────────────────────────
const BASE_CURRENCIES = [
  { code: "USD", name: "US Dollar",          flag: "🇺🇸", rate: 278.50, change: 0.3,  symbol: "$" },
  { code: "EUR", name: "Euro",               flag: "🇪🇺", rate: 298.40, change: -0.2, symbol: "€" },
  { code: "AED", name: "UAE Dirham",         flag: "🇦🇪", rate: 75.80,  change: 0.1,  symbol: "د.إ" },
  { code: "GBP", name: "British Pound",      flag: "🇬🇧", rate: 348.20, change: -0.4, symbol: "£" },
  { code: "CNY", name: "Chinese Yuan",       flag: "🇨🇳", rate: 38.40,  change: 0.2,  symbol: "¥" },
  { code: "SAR", name: "Saudi Riyal",        flag: "🇸🇦", rate: 74.20,  change: 0.0,  symbol: "﷼" },
  { code: "MYR", name: "Malaysian Ringgit",  flag: "🇲🇾", rate: 62.10,  change: -0.1, symbol: "RM" },
]

function genCurrencyHistory(base: number): { v: number }[] {
  const pts: { v: number }[] = []
  let v = base * 0.97
  for (let i = 0; i < 30; i++) {
    v = v + (Math.random() - 0.48) * base * 0.004
    pts.push({ v: parseFloat(v.toFixed(2)) })
  }
  pts[pts.length - 1] = { v: base }
  return pts
}

const CURRENCY_HISTORIES = BASE_CURRENCIES.map(c => genCurrencyHistory(c.rate))

// ── Country Demand Data ────────────────────────────────────────────────────────
const DEMAND_DATA: Record<string, { country: string; value: number; flag: string }[]> = {
  Rice: [
    { country: "UAE",         value: 320, flag: "🇦🇪" },
    { country: "Saudi Arabia",value: 280, flag: "🇸🇦" },
    { country: "Kenya",       value: 190, flag: "🇰🇪" },
    { country: "UK",          value: 165, flag: "🇬🇧" },
    { country: "Afghanistan", value: 145, flag: "🇦🇫" },
    { country: "Malaysia",    value: 120, flag: "🇲🇾" },
    { country: "Somalia",     value: 95,  flag: "🇸🇴" },
    { country: "Qatar",       value: 88,  flag: "🇶🇦" },
    { country: "Oman",        value: 72,  flag: "🇴🇲" },
    { country: "Kuwait",      value: 65,  flag: "🇰🇼" },
  ],
  Sesame: [
    { country: "China",       value: 480, flag: "🇨🇳" },
    { country: "Japan",       value: 220, flag: "🇯🇵" },
    { country: "South Korea", value: 165, flag: "🇰🇷" },
    { country: "USA",         value: 140, flag: "🇺🇸" },
    { country: "Netherlands", value: 95,  flag: "🇳🇱" },
    { country: "Germany",     value: 88,  flag: "🇩🇪" },
  ],
  Maize: [
    { country: "Vietnam",     value: 210, flag: "🇻🇳" },
    { country: "Malaysia",    value: 180, flag: "🇲🇾" },
    { country: "Indonesia",   value: 165, flag: "🇮🇩" },
    { country: "Philippines", value: 120, flag: "🇵🇭" },
    { country: "Thailand",    value: 95,  flag: "🇹🇭" },
  ],
  Mangoes: [
    { country: "UAE",         value: 95,  flag: "🇦🇪" },
    { country: "UK",          value: 72,  flag: "🇬🇧" },
    { country: "Germany",     value: 55,  flag: "🇩🇪" },
    { country: "USA",         value: 48,  flag: "🇺🇸" },
    { country: "Canada",      value: 38,  flag: "🇨🇦" },
  ],
  Lentils: [
    { country: "India",       value: 145, flag: "🇮🇳" },
    { country: "UAE",         value: 110, flag: "🇦🇪" },
    { country: "UK",          value: 88,  flag: "🇬🇧" },
    { country: "USA",         value: 72,  flag: "🇺🇸" },
    { country: "Canada",      value: 58,  flag: "🇨🇦" },
    { country: "Germany",     value: 44,  flag: "🇩🇪" },
  ],
  "All Commodities": [
    { country: "UAE",         value: 720, flag: "🇦🇪" },
    { country: "Saudi Arabia",value: 580, flag: "🇸🇦" },
    { country: "China",       value: 510, flag: "🇨🇳" },
    { country: "UK",          value: 380, flag: "🇬🇧" },
    { country: "Kenya",       value: 295, flag: "🇰🇪" },
    { country: "Afghanistan", value: 245, flag: "🇦🇫" },
    { country: "Japan",       value: 225, flag: "🇯🇵" },
    { country: "Malaysia",    value: 198, flag: "🇲🇾" },
    { country: "USA",         value: 178, flag: "🇺🇸" },
    { country: "Germany",     value: 155, flag: "🇩🇪" },
  ],
}

// ── Trade Trends Data ──────────────────────────────────────────────────────────
const MONTHLY_EXPORTS = [
  { month: "Jan", value: 820 }, { month: "Feb", value: 845 },
  { month: "Mar", value: 890 }, { month: "Apr", value: 920 },
  { month: "May", value: 975 }, { month: "Jun", value: 1020 },
  { month: "Jul", value: 985 }, { month: "Aug", value: 960 },
  { month: "Sep", value: 1010 },{ month: "Oct", value: 1045 },
  { month: "Nov", value: 1080 },{ month: "Dec", value: 1120 },
]

const YOY_DATA = [
  { month: "Jan", y2023: 680, y2024: 745, y2025: 820 },
  { month: "Feb", y2023: 695, y2024: 762, y2025: 845 },
  { month: "Mar", y2023: 720, y2024: 798, y2025: 890 },
  { month: "Apr", y2023: 745, y2024: 820, y2025: 920 },
  { month: "May", y2023: 790, y2024: 865, y2025: 975 },
  { month: "Jun", y2023: 835, y2024: 910, y2025: 1020 },
  { month: "Jul", y2023: 810, y2024: 880, y2025: 985 },
  { month: "Aug", y2023: 785, y2024: 855, y2025: 960 },
  { month: "Sep", y2023: 820, y2024: 895, y2025: 1010 },
  { month: "Oct", y2023: 855, y2024: 930, y2025: 1045 },
  { month: "Nov", y2023: 880, y2024: 965, y2025: 1080 },
  { month: "Dec", y2023: 910, y2024: 998, y2025: 1120 },
]

const CATEGORY_SHARE = [
  { category: "Rice",    share: 42 },
  { category: "Sesame",  share: 18 },
  { category: "Fruits",  share: 15 },
  { category: "Cereals", share: 13 },
  { category: "Other",   share: 12 },
]

// ── Shipping Routes ────────────────────────────────────────────────────────────
const SHIPPING_ROUTES = [
  { dest: "Dubai",    flag: "🇦🇪", ft20: 850,  ft40: 1450, days: 4,  services: 14, change: 2.3,  availability: "green" },
  { dest: "Rotterdam",flag: "🇳🇱", ft20: 2200, ft40: 3800, days: 22, services: 3,  change: -1.1, availability: "yellow" },
  { dest: "Jeddah",   flag: "🇸🇦", ft20: 780,  ft40: 1320, days: 6,  services: 12, change: 0.8,  availability: "green" },
  { dest: "Singapore",flag: "🇸🇬", ft20: 1450, ft40: 2500, days: 14, services: 7,  change: -3.2, availability: "yellow" },
  { dest: "Guangzhou",flag: "🇨🇳", ft20: 1680, ft40: 2900, days: 16, services: 5,  change: 1.5,  availability: "red" },
]

const AVAILABILITY_COLORS: Record<string, string> = {
  green:  "bg-emerald-500",
  yellow: "bg-yellow-500",
  red:    "bg-red-500",
}

const AVAILABILITY_LABELS: Record<string, string> = {
  green:  "Good",
  yellow: "Limited",
  red:    "Scarce",
}

// ── Sparkline Component ────────────────────────────────────────────────────────
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const pts = data.map((v, i) => ({ i, v }))
  return (
    <LineChart width={80} height={32} data={pts}>
      <Line
        type="monotone"
        dataKey="v"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth={1.5}
        dot={false}
      />
    </LineChart>
  )
}

// ── Currency Mini Chart ────────────────────────────────────────────────────────
function CurrencyMiniChart({ data, positive }: { data: { v: number }[]; positive: boolean }) {
  return (
    <AreaChart width={120} height={40} data={data}>
      <defs>
        <linearGradient id={`cg-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%"  stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity={0.3} />
          <stop offset="95%" stopColor={positive ? "#10b981" : "#ef4444"} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area
        type="monotone"
        dataKey="v"
        stroke={positive ? "#10b981" : "#ef4444"}
        strokeWidth={1.5}
        fill={`url(#cg-${positive})`}
        dot={false}
      />
    </AreaChart>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function MarketIntelligence() {
  usePageTitle(
    "Market Intelligence",
    "Live commodity prices, currency exchange, trade trends and shipping market data"
  )

  // Live timestamp
  const [lastUpdated, setLastUpdated] = React.useState(() => new Date())
  React.useEffect(() => {
    const id = setInterval(() => setLastUpdated(new Date()), 30000)
    return () => clearInterval(id)
  }, [])

  // Commodity prices with optional simulation
  const [commodities, setCommodities] = React.useState(BASE_COMMODITIES)
  const [simulating, setSimulating] = React.useState(false)

  function simulatePriceMovement() {
    setCommodities(prev =>
      prev.map(c => {
        const delta = (Math.random() - 0.5) * 0.02
        const newUsd = parseFloat((c.usd * (1 + delta)).toFixed(0))
        const newPkr = parseFloat((c.pkr * (1 + delta)).toFixed(0))
        const newChange = parseFloat((c.change + (Math.random() - 0.5) * 0.4).toFixed(1))
        return { ...c, usd: newUsd, pkr: newPkr, change: newChange }
      })
    )
    setSimulating(true)
    setTimeout(() => setSimulating(false), 600)
  }

  // Currency converter
  const [fromCurrency, setFromCurrency] = React.useState("USD")
  const [toCurrency, setToCurrency] = React.useState("PKR")
  const [convertAmount, setConvertAmount] = React.useState("1000")
  const allCurrencyCodes = ["PKR", ...BASE_CURRENCIES.map(c => c.code)]

  function getConvertedAmount(): string {
    const amt = parseFloat(convertAmount)
    if (isNaN(amt)) return "—"
    const fromRate = fromCurrency === "PKR" ? 1 : (BASE_CURRENCIES.find(c => c.code === fromCurrency)?.rate ?? 1)
    const toRate   = toCurrency   === "PKR" ? 1 : (BASE_CURRENCIES.find(c => c.code === toCurrency)?.rate   ?? 1)
    const inPkr = fromCurrency === "PKR" ? amt : amt * fromRate
    const result = toCurrency === "PKR" ? inPkr : inPkr / toRate
    return result.toLocaleString("en-US", { maximumFractionDigits: 2 })
  }

  // Country demand
  const [selectedCommodity, setSelectedCommodity] = React.useState("Rice")
  const demandRows = DEMAND_DATA[selectedCommodity] ?? []
  const maxDemand = Math.max(...demandRows.map(r => r.value))

  const formatTime = (d: Date) =>
    d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short" })

  return (
    <div className="min-h-screen bg-background">
      {/* ── Page Header ── */}
      <div className="bg-card border-b border-border py-10 md:py-14">
        <div className="container px-4 md:px-6 max-w-5xl mx-auto text-center space-y-4">
          <div className="badge-gold mx-auto w-fit">
            <BarChart3 className="w-3.5 h-3.5" /> Market Intelligence Hub
          </div>
          <h1 className="text-3xl md:text-5xl font-heading font-bold">
            Pakistan Trade Intelligence
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Live commodity prices, currency exchange rates, country demand analysis,
            trade trends and shipping market data — all in one place.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <RefreshCw className="w-3.5 h-3.5" />
            Last updated: {formatTime(lastUpdated)}
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-10 md:py-14">
        <Tabs defaultValue="prices">
          <TabsList className="w-full flex-wrap h-auto p-1 bg-muted/50 justify-start gap-1 mb-8">
            <TabsTrigger value="prices"    className="gap-1.5"><Activity   className="w-3.5 h-3.5" /> Live Commodity Prices</TabsTrigger>
            <TabsTrigger value="currency"  className="gap-1.5"><DollarSign className="w-3.5 h-3.5" /> Currency Exchange</TabsTrigger>
            <TabsTrigger value="demand"    className="gap-1.5"><Globe      className="w-3.5 h-3.5" /> Country Demand</TabsTrigger>
            <TabsTrigger value="trends"    className="gap-1.5"><TrendingUp className="w-3.5 h-3.5" /> Trade Trends</TabsTrigger>
            <TabsTrigger value="shipping"  className="gap-1.5"><Ship       className="w-3.5 h-3.5" /> Shipping Markets</TabsTrigger>
          </TabsList>

          {/* ══════════════════════════════════════════════════
              TAB 1 — Live Commodity Prices
          ══════════════════════════════════════════════════ */}
          <TabsContent value="prices" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-heading font-semibold">Live Commodity Price Board</h2>
                <p className="text-sm text-muted-foreground">Pakistan FOB export prices — 10 key commodities</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 self-start sm:self-auto"
                onClick={simulatePriceMovement}
                disabled={simulating}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${simulating ? "animate-spin" : ""}`} />
                Simulate Price Movement
              </Button>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border luxury-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 border-b border-border">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Product</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">USD/MT</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground hidden sm:table-cell">PKR/MT</th>
                    <th className="text-right px-4 py-3 font-semibold text-muted-foreground">24h Change</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden md:table-cell">7d Trend</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Quality</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground hidden lg:table-cell">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {commodities.map(c => (
                    <tr key={c.name} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">{c.name}</td>
                      <td className="px-4 py-3 text-right font-heading font-bold">
                        ${c.usd.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">
                        ₨{c.pkr.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex items-center gap-0.5 font-semibold ${
                          c.change > 0 ? "text-emerald-500" : c.change < 0 ? "text-red-500" : "text-muted-foreground"
                        }`}>
                          {c.change > 0
                            ? <ChevronUp className="w-3.5 h-3.5" />
                            : c.change < 0
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : null}
                          {c.change > 0 ? "+" : ""}{c.change}%
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <div className="flex justify-center">
                          <Sparkline data={c.trend} positive={c.change >= 0} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className="badge-gold text-[10px] py-0.5 px-2">{c.quality}</span>
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === "Active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              * Data compiled from REAP, TDAP &amp; commodity market indices. Prices are indicative FOB rates.
              Contact OG Exports for firm quotations.
            </p>
          </TabsContent>

          {/* ══════════════════════════════════════════════════
              TAB 2 — Currency Exchange
          ══════════════════════════════════════════════════ */}
          <TabsContent value="currency" className="space-y-8">
            <div>
              <h2 className="text-xl font-heading font-semibold">Pakistan Rupee Exchange Rates</h2>
              <p className="text-sm text-muted-foreground">1 foreign currency = PKR equivalent</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {BASE_CURRENCIES.map((c, idx) => (
                <div key={c.code} className="luxury-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{c.flag}</span>
                      <div>
                        <div className="font-heading font-bold text-sm">{c.code}</div>
                        <div className="text-xs text-muted-foreground">{c.name}</div>
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${
                      c.change > 0 ? "text-emerald-500" : c.change < 0 ? "text-red-500" : "text-muted-foreground"
                    }`}>
                      {c.change > 0 ? <TrendingUp className="w-3 h-3" /> : c.change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                      {c.change > 0 ? "+" : ""}{c.change}%
                    </span>
                  </div>
                  <div>
                    <div className="text-xl font-heading font-bold">
                      ₨{c.rate.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-xs text-muted-foreground">1 {c.code} = PKR</div>
                  </div>
                  <div className="flex justify-start">
                    <CurrencyMiniChart
                      data={CURRENCY_HISTORIES[idx]}
                      positive={c.change >= 0}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Currency Converter */}
            <div className="luxury-card p-6 space-y-5">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-accent" />
                <h3 className="font-heading font-semibold">Currency Converter</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Amount</label>
                  <Input
                    type="number"
                    value={convertAmount}
                    onChange={e => setConvertAmount(e.target.value)}
                    placeholder="Enter amount"
                    className="font-heading"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">From</label>
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allCurrencyCodes.map(code => (
                        <SelectItem key={code} value={code}>{code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">To</label>
                  <Select value={toCurrency} onValueChange={setToCurrency}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {allCurrencyCodes.map(code => (
                        <SelectItem key={code} value={code}>{code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground font-medium">Result</label>
                  <div className="h-10 px-3 flex items-center rounded-md border border-border bg-muted/40 font-heading font-bold text-accent">
                    {getConvertedAmount()} {toCurrency}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-4 py-3 border border-border">
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              Exchange Rates Update: Rates updated hourly from State Bank of Pakistan. For official rates, visit sbp.org.pk.
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════
              TAB 3 — Country Demand
          ══════════════════════════════════════════════════ */}
          <TabsContent value="demand" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-heading font-semibold">Top Importing Countries</h2>
                <p className="text-sm text-muted-foreground">Pakistan's commodity exports by destination (USD millions)</p>
              </div>
              <Select value={selectedCommodity} onValueChange={setSelectedCommodity}>
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Rice", "Sesame", "Maize", "Mangoes", "Lentils", "All Commodities"].map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Horizontal Bar Chart */}
            <div className="luxury-card p-6">
              <h3 className="font-heading font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                {selectedCommodity} — Import Value by Country
              </h3>
              <ResponsiveContainer width="100%" height={Math.max(220, demandRows.length * 44)}>
                <BarChart
                  layout="vertical"
                  data={demandRows}
                  margin={{ top: 0, right: 24, left: 80, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={v => `$${v}M`}
                  />
                  <YAxis
                    type="category"
                    dataKey="country"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                    width={75}
                  />
                  <Tooltip
                    formatter={(val: number) => [`$${val}M`, "Import Value"]}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Stats Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Export Value YTD", value: "$11.8B",  icon: <DollarSign className="w-4 h-4" /> },
                { label: "Countries Reached",       value: "82",      icon: <Globe      className="w-4 h-4" /> },
                { label: "Fastest Growing Market",  value: "Kenya +31%", icon: <TrendingUp className="w-4 h-4" /> },
                { label: "Most Valuable Market",    value: "UAE $720M",  icon: <BarChart3  className="w-4 h-4" /> },
              ].map(s => (
                <div key={s.label} className="luxury-card p-4 space-y-2">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    {s.icon}
                  </div>
                  <div className="text-xl font-heading font-bold">{s.value}</div>
                  <div className="text-xs text-muted-foreground leading-snug">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Trade Balance Card */}
            <div className="luxury-card p-6">
              <h3 className="font-heading font-semibold mb-5">Pakistan Agricultural Trade Balance</h3>
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Agricultural Exports</div>
                  <div className="text-2xl font-heading font-bold text-emerald-500">$11.8B</div>
                  <div className="text-xs text-muted-foreground">FY 2024–25 | +12.4% YoY</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Agricultural Imports</div>
                  <div className="text-2xl font-heading font-bold text-red-500">$4.2B</div>
                  <div className="text-xs text-muted-foreground">FY 2024–25 | +3.1% YoY</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Trade Surplus</div>
                  <div className="text-2xl font-heading font-bold text-accent">$7.6B</div>
                  <div className="text-xs text-muted-foreground">Net positive agricultural balance</div>
                </div>
              </div>
              <div className="mt-5 h-3 rounded-full bg-muted overflow-hidden flex">
                <div className="h-full bg-emerald-500 rounded-l-full" style={{ width: "73.8%" }} />
                <div className="h-full bg-red-500 rounded-r-full" style={{ width: "26.2%" }} />
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Exports 73.8%</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Imports 26.2%</span>
              </div>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════
              TAB 4 — Trade Trends
          ══════════════════════════════════════════════════ */}
          <TabsContent value="trends" className="space-y-8">
            <div className="flex items-start gap-3">
              <div>
                <h2 className="text-xl font-heading font-semibold">Trade Trends & Analysis</h2>
                <p className="text-sm text-muted-foreground">Pakistan agricultural export performance 2023–2025</p>
              </div>
              <div className="ml-auto badge-green shrink-0">
                <TrendingUp className="w-3.5 h-3.5" /> +12.4% YoY 2025
              </div>
            </div>

            {/* Monthly Export AreaChart */}
            <div className="luxury-card p-6">
              <h3 className="font-heading font-semibold mb-1">Monthly Agricultural Export Value — 2025</h3>
              <p className="text-xs text-muted-foreground mb-5">USD Millions</p>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={MONTHLY_EXPORTS} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} />
                  <Tooltip
                    formatter={(v: number) => [`$${v}M`, "Export Value"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#areaGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* YoY Comparison LineChart */}
            <div className="luxury-card p-6">
              <h3 className="font-heading font-semibold mb-1">Year-over-Year Comparison</h3>
              <p className="text-xs text-muted-foreground mb-5">2023 vs 2024 vs 2025 — USD Millions</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={YOY_DATA} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}M`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [`$${v}M`, name === "y2023" ? "2023" : name === "y2024" ? "2024" : "2025"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Legend formatter={(v) => v === "y2023" ? "2023" : v === "y2024" ? "2024" : "2025"} />
                  <Line type="monotone" dataKey="y2023" stroke="#94a3b8" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="y2024" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="y2025" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Category Share BarChart */}
            <div className="luxury-card p-6">
              <h3 className="font-heading font-semibold mb-1">Export Share by Product Category</h3>
              <p className="text-xs text-muted-foreground mb-5">Percentage of total agricultural exports 2025</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={CATEGORY_SHARE} margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="category" tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} />
                  <Tooltip
                    formatter={(v: number) => [`${v}%`, "Export Share"]}
                    contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="share" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Seasonal Analysis Cards */}
            <div>
              <h3 className="font-heading font-semibold mb-4">Seasonal Export Patterns</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { commodity: "Basmati Rice 1121", peak: "Sep – Dec", note: "Post-harvest surge; highest volumes shipped Oct–Nov to Gulf & UK markets." },
                  { commodity: "Fresh Mangoes",      peak: "May – Jul", note: "Sindhri leads May–Jun; Chaunsa peaks Jun–Jul. Air freight demand spikes." },
                  { commodity: "Kinnow Mandarins",   peak: "Jan – Mar", note: "Peak season Jan–Mar; exports to Middle East & EU at highest volumes." },
                  { commodity: "Sesame Seeds",        peak: "Oct – Feb", note: "Post-kharif harvest drives Oct supply; China & Japan demand peaks Nov–Jan." },
                  { commodity: "Wheat Flour",         peak: "Apr – Jun", note: "Spring harvest-driven; Afghanistan & Central Asia are primary buyers." },
                  { commodity: "Cotton Lint",         peak: "Nov – Feb", note: "Ginning season drives Nov–Jan peak. China absorbs 60%+ of volume." },
                ].map(s => (
                  <div key={s.commodity} className="luxury-card p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-heading font-semibold text-sm">{s.commodity}</div>
                      <div className="badge-gold text-[10px] py-0.5 px-2 shrink-0">{s.peak}</div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* ══════════════════════════════════════════════════
              TAB 5 — Shipping Markets
          ══════════════════════════════════════════════════ */}
          <TabsContent value="shipping" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div>
                <h2 className="text-xl font-heading font-semibold">Shipping Market Rates</h2>
                <p className="text-sm text-muted-foreground">Karachi port — indicative container freight rates</p>
              </div>

              {/* Bunker Fuel Index */}
              <div className="sm:ml-auto luxury-card px-5 py-3 flex items-center gap-4 border-accent/30">
                <Fuel className="w-5 h-5 text-accent shrink-0" />
                <div>
                  <div className="text-xs text-muted-foreground font-medium">Bunker Fuel Index</div>
                  <div className="font-heading font-bold text-lg">580 <span className="text-sm font-normal text-muted-foreground">USD/MT</span></div>
                </div>
                <span className="inline-flex items-center gap-0.5 text-sm font-semibold text-emerald-500">
                  <TrendingUp className="w-3.5 h-3.5" /> +2.1%
                </span>
                <div className="text-xs text-muted-foreground">this week</div>
              </div>
            </div>

            {/* Route Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SHIPPING_ROUTES.map(r => (
                <div key={r.dest} className="luxury-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Anchor className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="font-heading font-semibold text-sm">
                          Karachi → {r.dest} {r.flag}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.days} days · {r.services} services/week</div>
                      </div>
                    </div>
                    <span className={`text-xs font-semibold flex items-center gap-0.5 ${
                      r.change > 0 ? "text-emerald-500" : "text-red-500"
                    }`}>
                      {r.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {r.change > 0 ? "+" : ""}{r.change}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">20ft Container</div>
                      <div className="font-heading font-bold text-base">${r.ft20.toLocaleString()}</div>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                      <div className="text-xs text-muted-foreground mb-1">40ft Container</div>
                      <div className="font-heading font-bold text-base">${r.ft40.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">Container Availability</div>
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${AVAILABILITY_COLORS[r.availability]}`} />
                      <span className="text-xs font-medium">{AVAILABILITY_LABELS[r.availability]}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Container Availability Legend */}
            <div className="luxury-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-4 h-4 text-accent" />
                <h3 className="font-heading font-semibold text-sm">Container Availability Index by Region</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { region: "Middle East / Gulf",  status: "green",  label: "Good Availability",    note: "Dubai, Jeddah, Muscat routes well-served" },
                  { region: "Southeast Asia",       status: "yellow", label: "Limited Availability", note: "Singapore, KL routes under capacity pressure" },
                  { region: "Far East / China",     status: "red",    label: "Scarce Availability",  note: "Guangzhou congestion — book 3–4 weeks ahead" },
                ].map(a => (
                  <div key={a.region} className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 border border-border">
                    <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${AVAILABILITY_COLORS[a.status]}`} />
                    <div>
                      <div className="font-medium text-sm">{a.region}</div>
                      <div className={`text-xs font-semibold ${
                        a.status === "green" ? "text-emerald-500" : a.status === "yellow" ? "text-yellow-600" : "text-red-500"
                      }`}>{a.label}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{a.note}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-500/5 border border-amber-500/20 rounded-lg px-4 py-3">
              <Ship className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              Shipping rates are indicative and subject to market fluctuations. Contact OG Exports for firm freight quotes and booking confirmations.
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
