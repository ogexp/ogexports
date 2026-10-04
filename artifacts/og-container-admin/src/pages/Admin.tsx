import * as React from "react"
import {
  Users, ShieldCheck, Package, ShoppingCart, TrendingUp, Wallet,
  FileText, Bell, Settings, BarChart2, Globe, Lock, Eye,
  CheckCircle2, XCircle, Clock, AlertCircle, Download, Search,
  ArrowDownRight, ArrowUpRight, Activity, Database, Key,
  RefreshCw, Ban, UserCheck, ChevronRight, Shield, Landmark,
  BarChart3, History, CircleDollarSign
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { Link } from "wouter"
import { useToast } from "@/hooks/use-toast"

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_USERS = [
  { id: "u1", name: "Muhammad Zain", email: "zain@tradeco.pk", accountType: "supplier", kycStatus: "verified", country: "Pakistan", joined: "2026-01-12", orders: 24, sessions: 2 },
  { id: "u2", name: "Priya Sharma", email: "priya@globalbuyers.in", accountType: "buyer", kycStatus: "verified", country: "India", joined: "2026-02-08", orders: 11, sessions: 1 },
  { id: "u3", name: "James O'Brien", email: "james@investco.uk", accountType: "investor", kycStatus: "verified", country: "UK", joined: "2026-03-15", orders: 0, sessions: 3 },
  { id: "u4", name: "Ahmad Al-Rashid", email: "ahmad@khaleej.ae", accountType: "buyer", kycStatus: "pending", country: "UAE", joined: "2026-06-20", orders: 3, sessions: 1 },
  { id: "u5", name: "Chen Wei", email: "chen@sinotraders.cn", accountType: "buyer", kycStatus: "pending", country: "China", joined: "2026-07-01", orders: 0, sessions: 1 },
  { id: "u6", name: "Fatima Hassan", email: "fatima@export.ng", accountType: "supplier", kycStatus: "rejected", country: "Nigeria", joined: "2026-05-28", orders: 0, sessions: 0 },
  { id: "u7", name: "Ali Raza Khan", email: "ali@tradepk.com", accountType: "investor", kycStatus: "verified", country: "Pakistan", joined: "2026-04-10", orders: 0, sessions: 2 },
  { id: "u8", name: "Sara Johnson", email: "sara@gbfoods.us", accountType: "buyer", kycStatus: "unsubmitted", country: "USA", joined: "2026-07-10", orders: 0, sessions: 1 },
]

const MOCK_KYC = [
  { id: "k1", user: "Ahmad Al-Rashid", email: "ahmad@khaleej.ae", type: "Individual", submitted: "2026-07-05", status: "pending", docs: 4, country: "UAE" },
  { id: "k2", user: "Chen Wei", email: "chen@sinotraders.cn", type: "Company", submitted: "2026-07-08", status: "pending", docs: 6, country: "China" },
  { id: "k3", user: "Tariq Abdullah", email: "tariq@dxb.ae", type: "Company", submitted: "2026-07-09", status: "pending", docs: 5, country: "UAE" },
  { id: "k4", user: "Priya Sharma", email: "priya@globalbuyers.in", type: "Individual", submitted: "2026-01-28", status: "verified", docs: 4, country: "India" },
  { id: "k5", user: "Fatima Hassan", email: "fatima@export.ng", type: "Company", submitted: "2026-05-30", status: "rejected", docs: 3, country: "Nigeria" },
]

const MOCK_DEPOSITS = [
  { id: "DEP-001", user: "James O'Brien", email: "james@investco.uk", amount: 50000, currency: "USD", bank: "Standard Chartered", ref: "TXN20260708A", date: "Jul 8, 2026", status: "pending", receiptUploaded: true },
  { id: "DEP-002", user: "Ali Raza Khan", email: "ali@tradepk.com", amount: 25000, currency: "USD", bank: "Meezan Bank", ref: "TXN20260707B", date: "Jul 7, 2026", status: "pending", receiptUploaded: true },
  { id: "DEP-003", user: "Ahmad Al-Rashid", email: "ahmad@khaleej.ae", amount: 10000, currency: "USD", bank: "Emirates NBD", ref: "TXN20260701C", date: "Jul 1, 2026", status: "approved", receiptUploaded: true },
  { id: "DEP-004", user: "Chen Wei", email: "chen@sinotraders.cn", amount: 30000, currency: "USD", bank: "ICBC", ref: "TXN20260620D", date: "Jun 20, 2026", status: "approved", receiptUploaded: true },
  { id: "DEP-005", user: "Priya Sharma", email: "priya@globalbuyers.in", amount: 5000, currency: "USD", bank: "HDFC Bank", ref: "TXN20260615E", date: "Jun 15, 2026", status: "rejected", receiptUploaded: false },
]

const MOCK_WITHDRAWALS = [
  { id: "WD-001", user: "James O'Brien", email: "james@investco.uk", amount: 8000, currency: "USD", bank: "Standard Chartered NY", iban: "PK84SCBL…7890", date: "Jul 5, 2026", status: "pending" },
  { id: "WD-002", user: "Ali Raza Khan", email: "ali@tradepk.com", amount: 15000, currency: "USD", bank: "Meezan Bank", iban: "PK36MEZN…7890", date: "Jul 3, 2026", status: "processing" },
  { id: "WD-003", user: "Ahmad Al-Rashid", email: "ahmad@khaleej.ae", amount: 20000, currency: "USD", bank: "Emirates NBD", iban: "AE070331234567890123456", date: "Jun 28, 2026", status: "completed" },
]

const MOCK_ORDERS = [
  { id: "ORD-2026-0041", product: "Premium Basmati Rice", buyer: "Priya Sharma", supplier: "Punjab Agro Exports", quantity: "2x 20ft FCL", amount: 92000, status: "shipped", date: "2026-06-14" },
  { id: "ORD-2026-0040", product: "Yellow Maize", buyer: "Ahmad Al-Rashid", supplier: "Golden Harvest", quantity: "1x 40ft HC", amount: 31200, status: "confirmed", date: "2026-07-02" },
  { id: "ORD-2026-0039", product: "Sesame Seeds", buyer: "James Partners Ltd", supplier: "Atlas Foods", quantity: "500 MT", amount: 690000, status: "pending", date: "2026-07-08" },
  { id: "ORD-2026-0038", product: "Green Cardamom", buyer: "Chen Wei Trading", supplier: "Himalayan Natural", quantity: "250 kg", amount: 3250, status: "delivered", date: "2026-05-22" },
]

const MOCK_INVESTMENTS = [
  { id: "CTR-0018", commodity: "Premium Basmati Rice", fundingPct: 74, containerValue: 180000, raised: 133200, investors: 18, status: "funding", expectedReturn: "12.5%" },
  { id: "CTR-0019", commodity: "Green Cardamom", fundingPct: 42, containerValue: 95000, raised: 39900, investors: 8, status: "funding", expectedReturn: "18.2%" },
  { id: "CTR-0017", commodity: "Sesame Seeds", fundingPct: 100, containerValue: 140000, raised: 140000, investors: 24, status: "in_transit", expectedReturn: "14.0%" },
  { id: "CTR-0016", commodity: "Yellow Maize", fundingPct: 100, containerValue: 85000, raised: 85000, investors: 12, status: "settled", expectedReturn: "11.8%" },
]

const AUDIT_LOGS = [
  { id: 1, action: "KYC Approved", user: "Ahmad Al-Rashid", admin: "admin@ogexports.com", ip: "182.180.x.x", time: "Jul 11, 2026 · 09:45 AM", level: "info" },
  { id: 2, action: "Deposit Approved", user: "James O'Brien", admin: "admin@ogexports.com", ip: "182.180.x.x", time: "Jul 11, 2026 · 09:30 AM", level: "success" },
  { id: 3, action: "Withdrawal Rejected", user: "Chen Wei", admin: "admin@ogexports.com", ip: "182.180.x.x", time: "Jul 10, 2026 · 04:15 PM", level: "warning" },
  { id: 4, action: "User Suspended", user: "Fatima Hassan", admin: "admin@ogexports.com", ip: "182.180.x.x", time: "Jul 9, 2026 · 11:20 AM", level: "error" },
  { id: 5, action: "KYC Rejected", user: "Fatima Hassan", admin: "admin@ogexports.com", ip: "182.180.x.x", time: "Jul 9, 2026 · 11:18 AM", level: "warning" },
  { id: 6, action: "Admin Login", user: "admin@ogexports.com", admin: "—", ip: "182.180.x.x", time: "Jul 9, 2026 · 08:00 AM", level: "info" },
  { id: 7, action: "Deposit Approved", user: "Ali Raza Khan", admin: "admin@ogexports.com", ip: "182.180.x.x", time: "Jul 8, 2026 · 02:40 PM", level: "success" },
  { id: 8, action: "Investment Activated", user: "James O'Brien", admin: "admin@ogexports.com", ip: "182.180.x.x", time: "Jul 7, 2026 · 10:05 AM", level: "success" },
]

const ADMIN_STATS = [
  { label: "Total Users", value: "1,284", change: "+42 this week", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-l-blue-500" },
  { label: "KYC Pending", value: "17", change: "Action required", icon: ShieldCheck, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-l-amber-500" },
  { label: "Active Orders", value: "83", change: "+12 today", icon: ShoppingCart, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-l-emerald-500" },
  { label: "Total Revenue", value: "$4.8M", change: "+18% MoM", icon: TrendingUp, color: "text-accent", bg: "bg-accent/10", border: "border-l-amber-400" },
  { label: "Active Containers", value: "12", change: "$2.1M total", icon: Globe, color: "text-violet-500", bg: "bg-violet-500/10", border: "border-l-violet-500" },
  { label: "Pending Deposits", value: "6", change: "Need verification", icon: ArrowDownRight, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-l-orange-500" },
  { label: "Pending Withdrawals", value: "2", change: "Awaiting release", icon: ArrowUpRight, color: "text-rose-500", bg: "bg-rose-500/10", border: "border-l-rose-500" },
  { label: "Unread Alerts", value: "3", change: "System alerts", icon: Bell, color: "text-red-500", bg: "bg-red-500/10", border: "border-l-red-500" },
]

// ─── Badge Helpers ────────────────────────────────────────────────────────────

function KycBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    verified: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    rejected: "bg-red-500/10 text-red-500 border-red-500/20",
    unsubmitted: "bg-muted text-muted-foreground border-border",
  }
  const icons: Record<string, React.ReactNode> = {
    verified: <CheckCircle2 className="w-3 h-3" />,
    pending: <Clock className="w-3 h-3" />,
    rejected: <XCircle className="w-3 h-3" />,
  }
  return (
    <Badge variant="outline" className={`gap-1 text-xs ${map[status] ?? "bg-muted text-muted-foreground"}`}>
      {icons[status]} {status}
    </Badge>
  )
}

function OrderBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    confirmed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    shipped: "bg-violet-500/10 text-violet-500 border-violet-500/20",
    delivered: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
  }
  return <Badge variant="outline" className={`text-xs capitalize ${map[status] ?? ""}`}>{status}</Badge>
}

function FinanceBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600 border-amber-500/30",
    approved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    processing: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    rejected: "bg-red-500/10 text-red-600 border-red-500/30",
  }
  return <Badge variant="outline" className={`text-[10px] capitalize ${map[status] ?? ""}`}>{status}</Badge>
}

function AuditLevelDot({ level }: { level: string }) {
  const map: Record<string, string> = {
    info: "bg-blue-500", success: "bg-emerald-500", warning: "bg-amber-500", error: "bg-red-500"
  }
  return <span className={`w-2 h-2 rounded-full shrink-0 ${map[level] ?? "bg-muted"}`} />
}

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Admin() {
  const { isSignedIn } = useSafeAuth()
  const { toast } = useToast()
  const [search, setSearch] = React.useState("")
  const [kycFilter, setKycFilter] = React.useState<string>("all")
  const [depFilter, setDepFilter] = React.useState<string>("all")

  const filteredUsers = MOCK_USERS.filter(u =>
    [u.name, u.email, u.country, u.accountType].some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  )

  const filteredKyc = kycFilter === "all" ? MOCK_KYC : MOCK_KYC.filter(k => k.status === kycFilter)
  const filteredDep = depFilter === "all" ? MOCK_DEPOSITS : MOCK_DEPOSITS.filter(d => d.status === depFilter)

  const approveAction = (type: string, id: string) =>
    toast({ title: `${type} Approved`, description: `${id} has been approved and user notified.` })
  const rejectAction = (type: string, id: string) =>
    toast({ title: `${type} Rejected`, description: `${id} has been rejected and user notified.`, variant: "destructive" })

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 py-24 px-4">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Lock className="w-7 h-7 text-muted-foreground" />
        </div>
        <h1 className="text-3xl font-heading font-bold text-center">Admin Panel</h1>
        <p className="text-muted-foreground text-center max-w-sm">This area is restricted to authorized administrators. Sign in with your admin credentials to continue.</p>
        <Link href="/sign-in"><Button size="lg">Sign In</Button></Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border py-6 md:py-8">
        <div className="container px-4 md:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs gap-1">
                <Shield className="w-3 h-3" /> Admin
              </Badge>
              <span className="text-xs text-muted-foreground">Super Administrator</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-heading font-bold">Control Panel</h1>
            <p className="text-sm text-muted-foreground mt-0.5">OG Exports (Private) Limited — Platform Management</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-2 text-xs">
              <Download className="w-3.5 h-3.5" /> Export Report
            </Button>
            <Button size="sm" className="gap-2 text-xs">
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
            </Button>
          </div>
        </div>
      </div>

      <div className="container px-4 md:px-6 py-8 space-y-8">
        {/* 8 KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ADMIN_STATS.map(s => (
            <Card key={s.label} className="border-border/60 bg-card/80 relative overflow-hidden">
              <div className={`absolute inset-y-0 left-0 w-1 ${s.border}`} />
              <CardContent className="p-4 pl-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-heading font-bold mt-0.5">{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.change}</p>
                  </div>
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main tabs */}
        <Tabs defaultValue="users">
          <TabsList className="w-full flex-wrap h-auto p-1.5 bg-muted/50 justify-start gap-1 rounded-xl">
            {[
              { value: "users", icon: Users, label: "Users" },
              { value: "kyc", icon: ShieldCheck, label: "KYC Review", badge: MOCK_KYC.filter(k => k.status === "pending").length },
              { value: "deposits", icon: ArrowDownRight, label: "Deposits", badge: MOCK_DEPOSITS.filter(d => d.status === "pending").length },
              { value: "withdrawals", icon: ArrowUpRight, label: "Withdrawals", badge: MOCK_WITHDRAWALS.filter(w => w.status === "pending").length },
              { value: "orders", icon: ShoppingCart, label: "Orders" },
              { value: "investments", icon: TrendingUp, label: "Investments" },
              { value: "wallet", icon: Wallet, label: "Wallet" },
              { value: "analytics", icon: BarChart3, label: "Analytics" },
              { value: "audit", icon: History, label: "Audit Logs" },
              { value: "settings", icon: Settings, label: "Settings" },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value}
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-1.5 text-xs px-3 py-2 h-auto">
                <t.icon className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{t.label}</span>
                {t.badge != null && t.badge > 0 && (
                  <Badge className="ml-0.5 px-1.5 py-0 h-4 text-[9px] min-w-[16px] bg-red-500 text-white border-0">{t.badge}</Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Users ── */}
          <TabsContent value="users" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h3 className="text-lg font-heading font-semibold">User Management</h3>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search users..." className="pl-9 h-9 text-sm" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <Card className="border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      {["User", "Account Type", "KYC Status", "Country", "Joined", "Orders", "Sessions", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredUsers.map(u => (
                      <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-medium text-sm">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <Badge variant="outline" className="text-xs capitalize">{u.accountType}</Badge>
                        </td>
                        <td className="px-4 py-3.5"><KycBadge status={u.kycStatus} /></td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">{u.country}</td>
                        <td className="px-4 py-3.5 text-muted-foreground text-xs">{u.joined}</td>
                        <td className="px-4 py-3.5 font-medium text-xs">{u.orders}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{u.sessions}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => toast({ title: `Viewing ${u.name}` })}>
                              <Eye className="w-3 h-3" /> View
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500 hover:text-red-600 text-xs gap-1" onClick={() => toast({ title: `${u.name} suspended`, variant: "destructive" })}>
                              <Ban className="w-3 h-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground flex justify-between items-center">
                <span>Showing {filteredUsers.length} of {MOCK_USERS.length} users</span>
                <Button variant="ghost" size="sm" className="text-xs">Load More</Button>
              </div>
            </Card>
          </TabsContent>

          {/* ── KYC Review ── */}
          <TabsContent value="kyc" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h3 className="text-lg font-heading font-semibold">KYC Verification Review</h3>
              <div className="flex gap-2">
                {["all", "pending", "verified", "rejected"].map(f => (
                  <Button key={f} size="sm" variant={kycFilter === f ? "default" : "outline"} className="text-xs h-8 capitalize" onClick={() => setKycFilter(f)}>{f}</Button>
                ))}
              </div>
            </div>
            <Card className="border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      {["Applicant", "Type", "Country", "Submitted", "Docs", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredKyc.map(k => (
                      <tr key={k.id} className={`hover:bg-muted/20 transition-colors ${k.status === "pending" ? "bg-amber-500/5" : ""}`}>
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-medium text-sm">{k.user}</p>
                            <p className="text-xs text-muted-foreground">{k.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5"><Badge variant="outline" className="text-xs">{k.type}</Badge></td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{k.country}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{k.submitted}</td>
                        <td className="px-4 py-3.5 text-xs">{k.docs} files</td>
                        <td className="px-4 py-3.5"><KycBadge status={k.status} /></td>
                        <td className="px-4 py-3.5">
                          {k.status === "pending" ? (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 px-2 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => approveAction("KYC", k.id)}>
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-red-500 hover:bg-red-50 border-red-200 text-xs gap-1" onClick={() => rejectAction("KYC", k.id)}>
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1" onClick={() => toast({ title: `Viewing ${k.user} KYC` })}>
                              <Eye className="w-3 h-3" /> View
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── Deposits ── */}
          <TabsContent value="deposits" className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <h3 className="text-lg font-heading font-semibold">Deposit Approval</h3>
              <div className="flex gap-2">
                {["all", "pending", "approved", "rejected"].map(f => (
                  <Button key={f} size="sm" variant={depFilter === f ? "default" : "outline"} className="text-xs h-8 capitalize" onClick={() => setDepFilter(f)}>{f}</Button>
                ))}
              </div>
            </div>
            <Card className="border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      {["Depositor", "Amount", "Bank", "Reference", "Date", "Receipt", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filteredDep.map(dep => (
                      <tr key={dep.id} className={`hover:bg-muted/20 transition-colors ${dep.status === "pending" ? "bg-amber-500/5" : ""}`}>
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-medium text-sm">{dep.user}</p>
                            <p className="text-xs text-muted-foreground">{dep.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold">{fmt(dep.amount)}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{dep.bank}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{dep.ref}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{dep.date}</td>
                        <td className="px-4 py-3.5">
                          {dep.receiptUploaded
                            ? <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 text-emerald-600"><CheckCircle2 className="w-3 h-3" /> View</Button>
                            : <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Missing</span>}
                        </td>
                        <td className="px-4 py-3.5"><FinanceBadge status={dep.status} /></td>
                        <td className="px-4 py-3.5">
                          {dep.status === "pending" ? (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 px-2 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => approveAction("Deposit", dep.id)}>
                                <CheckCircle2 className="w-3 h-3" /> Approve
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-red-500 hover:bg-red-50 border-red-200 text-xs gap-1" onClick={() => rejectAction("Deposit", dep.id)}>
                                <XCircle className="w-3 h-3" /> Reject
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"><Eye className="w-3 h-3" /></Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── Withdrawals ── */}
          <TabsContent value="withdrawals" className="mt-6 space-y-4">
            <h3 className="text-lg font-heading font-semibold">Withdrawal Processing</h3>
            <Card className="border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      {["Beneficiary", "Amount", "Bank / IBAN", "Date", "Status", "Actions"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {MOCK_WITHDRAWALS.map(w => (
                      <tr key={w.id} className={`hover:bg-muted/20 transition-colors ${w.status === "pending" ? "bg-amber-500/5" : ""}`}>
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="font-medium text-sm">{w.user}</p>
                            <p className="text-xs text-muted-foreground">{w.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 font-bold">{fmt(w.amount)}</td>
                        <td className="px-4 py-3.5">
                          <div>
                            <p className="text-xs">{w.bank}</p>
                            <p className="text-xs font-mono text-muted-foreground">{w.iban}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{w.date}</td>
                        <td className="px-4 py-3.5"><FinanceBadge status={w.status} /></td>
                        <td className="px-4 py-3.5">
                          {w.status === "pending" ? (
                            <div className="flex gap-1">
                              <Button size="sm" className="h-7 px-2 text-xs gap-1 bg-emerald-600 hover:bg-emerald-700" onClick={() => approveAction("Withdrawal", w.id)}>
                                <CheckCircle2 className="w-3 h-3" /> Release
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 px-2 text-red-500 hover:bg-red-50 border-red-200 text-xs gap-1" onClick={() => rejectAction("Withdrawal", w.id)}>
                                <XCircle className="w-3 h-3" /> Hold
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"><Eye className="w-3 h-3" /></Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── Orders ── */}
          <TabsContent value="orders" className="mt-6 space-y-4">
            <h3 className="text-lg font-heading font-semibold">Order Management</h3>
            <Card className="border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      {["Order ID", "Product", "Buyer", "Supplier", "Quantity", "Amount", "Date", "Status"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {MOCK_ORDERS.map(o => (
                      <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{o.id}</td>
                        <td className="px-4 py-3.5 font-medium text-sm">{o.product}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{o.buyer}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{o.supplier}</td>
                        <td className="px-4 py-3.5 text-xs">{o.quantity}</td>
                        <td className="px-4 py-3.5 font-bold">{fmt(o.amount)}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{o.date}</td>
                        <td className="px-4 py-3.5"><OrderBadge status={o.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </TabsContent>

          {/* ── Investments ── */}
          <TabsContent value="investments" className="mt-6 space-y-4">
            <h3 className="text-lg font-heading font-semibold">Container Investment Management</h3>
            <div className="grid gap-4">
              {MOCK_INVESTMENTS.map(inv => (
                <Card key={inv.id} className="border-border/60 bg-card/80">
                  <CardContent className="p-5">
                    <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-semibold">{inv.commodity}</h4>
                          <Badge variant="outline" className="text-xs font-mono">{inv.id}</Badge>
                          <Badge variant="outline" className={`text-xs capitalize ${
                            inv.status === "funding" ? "border-blue-500/30 text-blue-600" :
                            inv.status === "in_transit" ? "border-violet-500/30 text-violet-600" :
                            "border-emerald-500/30 text-emerald-600"
                          }`}>{inv.status.replace("_", " ")}</Badge>
                        </div>
                        <div className="flex items-center gap-6 text-xs text-muted-foreground">
                          <span>{inv.investors} investors</span>
                          <span>Target ROI: {inv.expectedReturn}</span>
                          <span>Total: {fmt(inv.containerValue)}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 md:w-64">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Raised</span>
                          <span className="font-medium">{fmt(inv.raised)} / {fmt(inv.containerValue)}</span>
                        </div>
                        <Progress value={inv.fundingPct} className="h-2" />
                        <div className="text-xs text-right text-muted-foreground">{inv.fundingPct}% funded</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Wallet ── */}
          <TabsContent value="wallet" className="mt-6 space-y-4">
            <h3 className="text-lg font-heading font-semibold">Wallet & Financial Overview</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: "Total Platform Wallets", value: fmt(1284000), color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "Total Deposits (Jul)", value: fmt(175000), color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Total Withdrawals (Jul)", value: fmt(43000), color: "text-red-500", bg: "bg-red-500/10" },
                { label: "Platform Revenue (Jul)", value: fmt(12800), color: "text-accent", bg: "bg-accent/10" },
              ].map(c => (
                <Card key={c.label} className="border-border/60 bg-card/80">
                  <CardContent className="p-5 text-center space-y-1">
                    <p className="text-xs text-muted-foreground">{c.label}</p>
                    <p className={`text-xl font-heading font-bold ${c.color}`}>{c.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card className="border-border/60">
              <CardHeader><CardTitle className="text-base font-heading">Top Wallet Balances</CardTitle></CardHeader>
              <CardContent className="divide-y divide-border/30">
                {[
                  { user: "James O'Brien", balance: 48500, type: "investor" },
                  { user: "Ali Raza Khan", balance: 32000, type: "investor" },
                  { user: "Muhammad Zain", balance: 18750, type: "supplier" },
                  { user: "Chen Wei", balance: 12400, type: "buyer" },
                ].map(w => (
                  <div key={w.user} className="py-3 flex items-center justify-between text-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{w.user[0]}</div>
                      <div>
                        <p className="font-medium">{w.user}</p>
                        <p className="text-xs text-muted-foreground capitalize">{w.type}</p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-600">{fmt(w.balance)}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Analytics ── */}
          <TabsContent value="analytics" className="mt-6 space-y-4">
            <h3 className="text-lg font-heading font-semibold">Platform Analytics</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly bar chart */}
              <Card className="border-border/60 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading">Monthly Revenue (2026)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-end gap-2 h-40">
                    {[
                      { m: "Jan", v: 60 }, { m: "Feb", v: 72 }, { m: "Mar", v: 55 },
                      { m: "Apr", v: 80 }, { m: "May", v: 65 }, { m: "Jun", v: 90 }, { m: "Jul", v: 78 },
                    ].map(b => (
                      <div key={b.m} className="flex-1 flex flex-col items-center gap-1">
                        <div className="w-full bg-gradient-to-t from-primary to-primary/50 rounded-t-lg" style={{ height: `${b.v * 1.5}px` }} />
                        <span className="text-[10px] text-muted-foreground">{b.m}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* User growth */}
              <Card className="border-border/60 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading">User Growth</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Buyers", count: 856, pct: 67, color: "bg-blue-500" },
                    { label: "Suppliers", count: 312, pct: 24, color: "bg-emerald-500" },
                    { label: "Investors", count: 116, pct: 9, color: "bg-amber-500" },
                  ].map(r => (
                    <div key={r.label} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span>{r.label}</span>
                        <span className="font-medium">{r.count} ({r.pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Country breakdown */}
              <Card className="border-border/60 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading">Top Markets by Volume</CardTitle>
                </CardHeader>
                <CardContent className="divide-y divide-border/30">
                  {[
                    { country: "UAE", volume: fmt(1240000), pct: 28 },
                    { country: "United Kingdom", volume: fmt(980000), pct: 22 },
                    { country: "India", volume: fmt(750000), pct: 17 },
                    { country: "Saudi Arabia", volume: fmt(610000), pct: 14 },
                    { country: "China", volume: fmt(420000), pct: 9 },
                  ].map(c => (
                    <div key={c.country} className="py-2.5 flex items-center justify-between text-sm gap-4">
                      <span>{c.country}</span>
                      <div className="flex items-center gap-3">
                        <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${c.pct * 3.5}%` }} />
                        </div>
                        <span className="font-medium text-xs w-20 text-right">{c.volume}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* KYC stats */}
              <Card className="border-border/60 bg-card/80">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-heading">KYC Status Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    { label: "Verified", count: 892, pct: 69, color: "bg-emerald-500" },
                    { label: "Pending", count: 217, pct: 17, color: "bg-amber-500" },
                    { label: "Unsubmitted", count: 132, pct: 10, color: "bg-muted-foreground" },
                    { label: "Rejected", count: 43, pct: 4, color: "bg-red-500" },
                  ].map(r => (
                    <div key={r.label} className="space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span>{r.label}</span>
                        <span className="font-medium">{r.count} ({r.pct}%)</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct * 1.4}%` }} />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Audit Logs ── */}
          <TabsContent value="audit" className="mt-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-semibold">Audit & Security Logs</h3>
              <Button variant="outline" size="sm" className="gap-2 text-xs">
                <Download className="w-3.5 h-3.5" /> Export Logs
              </Button>
            </div>
            <Card className="border-border/60">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50 text-muted-foreground">
                      {["Level", "Action", "User / Subject", "Performed By", "IP Address", "Timestamp"].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs uppercase tracking-wider font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {AUDIT_LOGS.map(log => (
                      <tr key={log.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3.5"><AuditLevelDot level={log.level} /></td>
                        <td className="px-4 py-3.5 font-medium text-sm">{log.action}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{log.user}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground">{log.admin}</td>
                        <td className="px-4 py-3.5 font-mono text-xs text-muted-foreground">{log.ip}</td>
                        <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">{log.time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-3 border-t border-border/30 text-xs text-muted-foreground flex justify-between">
                <span>Showing {AUDIT_LOGS.length} of 500+ log entries</span>
                <Button variant="ghost" size="sm" className="text-xs">Load More</Button>
              </div>
            </Card>
          </TabsContent>

          {/* ── Settings ── */}
          <TabsContent value="settings" className="mt-6 space-y-6">
            <h3 className="text-lg font-heading font-semibold">Admin Settings</h3>
            {[
              {
                title: "Platform Settings",
                icon: Settings,
                fields: [
                  { label: "Platform Name", value: "OG Exports (Private) Limited" },
                  { label: "Support Email", value: "support@ogexports.com" },
                  { label: "Admin Email", value: "admin@ogexports.com" },
                  { label: "Minimum Deposit (USD)", value: "100" },
                  { label: "Minimum Withdrawal (USD)", value: "100" },
                  { label: "Processing Fee (%)", value: "0.5" },
                ],
              },
              {
                title: "Security Settings",
                icon: Shield,
                fields: [
                  { label: "Session Timeout (minutes)", value: "60" },
                  { label: "Max Login Attempts", value: "5" },
                  { label: "2FA Required for Admin", value: "Yes" },
                  { label: "IP Whitelist", value: "182.180.0.0/24" },
                ],
              },
              {
                title: "Notification Settings",
                icon: Bell,
                fields: [
                  { label: "New Deposit Alert", value: "Email + SMS" },
                  { label: "KYC Submission Alert", value: "Email" },
                  { label: "Withdrawal Request Alert", value: "Email + SMS" },
                  { label: "Daily Report", value: "Email (08:00 AM PKT)" },
                ],
              },
            ].map(section => (
              <Card key={section.title} className="border-border/60 bg-card/80">
                <CardHeader className="pb-3 border-b border-border/40">
                  <CardTitle className="text-sm font-heading flex items-center gap-2">
                    <section.icon className="w-4 h-4 text-primary" /> {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="divide-y divide-border/30">
                    {section.fields.map(f => (
                      <div key={f.label} className="py-3 flex items-center justify-between gap-4">
                        <span className="text-sm text-muted-foreground">{f.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{f.value}</span>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs opacity-50 hover:opacity-100"
                            onClick={() => toast({ title: `Editing ${f.label}` })}>
                            Edit
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
