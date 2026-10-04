import { useState } from "react"
import { Link } from "wouter"
import { useGetMe } from "@workspace/api-client-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  TrendingUp, Package, Ship, FileText, Brain, Globe, Bell,
  ArrowRight, CheckCircle2, Clock, AlertCircle, CircleDollarSign,
  BarChart3, ShoppingCart, Users, Zap, Star, Activity,
  MessageSquare, Upload, Download, Wallet, ChevronRight
} from "lucide-react"

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n)

const RECENT_ACTIVITY = [
  { id: 1, type: "deposit", title: "Deposit Approved", desc: "PKR 500,000 deposit confirmed", time: "2 hours ago", status: "success" },
  { id: 2, type: "investment", title: "Investment Active", desc: "Basmati Rice Container — $25,000", time: "1 day ago", status: "success" },
  { id: 3, type: "rfq", title: "RFQ Response Received", desc: "Yellow Maize — 2 supplier quotes ready", time: "2 days ago", status: "info" },
  { id: 4, type: "kyc", title: "KYC Under Review", desc: "Documents submitted, under verification", time: "3 days ago", status: "warning" },
  { id: 5, type: "shipment", title: "Shipment Departed", desc: "Container MRKU3456789 — Port Qasim", time: "5 days ago", status: "info" },
]

const NOTIFICATIONS_PREVIEW = [
  { id: 1, title: "KYC Approved", msg: "Your identity verification is complete.", unread: true, time: "1h ago" },
  { id: 2, title: "New RFQ Quote", msg: "3 suppliers responded to your Sesame RFQ.", unread: true, time: "3h ago" },
  { id: 3, title: "Investment Return", msg: "$1,850 return credited to your wallet.", unread: false, time: "1d ago" },
]

const QUICK_ACTIONS_BUYER = [
  { label: "Browse Products", icon: Package, href: "/products", color: "text-emerald-500" },
  { label: "Wholesale", icon: Globe, href: "/wholesale", color: "text-blue-500" },
  { label: "Freight Quote", icon: Ship, href: "/contact", color: "text-violet-500" },
  { label: "AI Assistant", icon: Brain, href: "/ai", color: "text-amber-500" },
  { label: "Documents", icon: FileText, href: "/documents", color: "text-rose-500" },
  { label: "Market Data", icon: BarChart3, href: "/market-intelligence", color: "text-cyan-500" },
]

const QUICK_ACTIONS_INVESTOR = [
  { label: "Invest Now", icon: TrendingUp, href: "/invest", color: "text-emerald-500" },
  { label: "Deposit Funds", icon: CircleDollarSign, href: "/account/deposit", color: "text-amber-500" },
  { label: "Withdraw", icon: Wallet, href: "/account/withdrawal", color: "text-violet-500" },
  { label: "AI Advisor", icon: Brain, href: "/ai", color: "text-blue-500" },
  { label: "Market Intel", icon: BarChart3, href: "/market-intelligence", color: "text-cyan-500" },
  { label: "Documents", icon: FileText, href: "/documents", color: "text-rose-500" },
]

const PLATFORM_MODULES = [
  { label: "Wholesale Market", desc: "Pakistan wholesale products", icon: Globe, href: "/wholesale", stat: "10,000+ MT stock" },
  { label: "Products", desc: "Premium agricultural catalog", icon: Package, href: "/products", stat: "8,500+ SKUs" },
  { label: "Freight", desc: "Compare freight forwarders", icon: Ship, href: "/contact", stat: "50+ carriers" },
  { label: "Invest", desc: "Containerized investments", icon: TrendingUp, href: "/invest", stat: "12–18% ROI" },
]

function StatusIcon({ status }: { status: string }) {
  if (status === "success") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />
  if (status === "warning") return <AlertCircle className="w-4 h-4 text-amber-500" />
  return <Clock className="w-4 h-4 text-blue-500" />
}

function StatCard({ label, value, sub, icon: Icon, accent }: { label: string; value: string; sub: string; icon: any; accent: string }) {
  return (
    <Card className="relative overflow-hidden border border-border/60 bg-card/80 backdrop-blur">
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <CardContent className="p-5 pl-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
            <p className="text-2xl font-heading font-bold truncate">{value}</p>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent.replace("bg-", "bg-").replace("border-l-", "bg-")} bg-opacity-10`}
            style={{ background: "rgba(16,185,129,0.1)" }}>
            <Icon className={`w-5 h-5 ${accent.includes("emerald") ? "text-emerald-500" : accent.includes("amber") ? "text-amber-500" : accent.includes("blue") ? "text-blue-500" : "text-violet-500"}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardTab() {
  const { data: me } = useGetMe()
  const isInvestor = me?.accountType === "investor"
  const isSupplier = me?.accountType === "supplier"
  const quickActions = isInvestor ? QUICK_ACTIONS_INVESTOR : QUICK_ACTIONS_BUYER

  const kycPct = me?.kycStatus === "verified" ? 100 : me?.kycStatus === "pending" ? 75 : me?.kycStatus === "rejected" ? 40 : 20
  const profilePct = 65

  const investorStats = [
    { label: "Portfolio Value", value: fmt(125000), sub: "3 active investments", icon: TrendingUp, accent: "border-l-emerald-500" },
    { label: "Wallet Balance", value: fmt(48500), sub: "Available to invest", icon: Wallet, accent: "border-l-amber-500" },
    { label: "Total Returns", value: fmt(18750), sub: "+15% overall ROI", icon: BarChart3, accent: "border-l-blue-500" },
    { label: "Pending Returns", value: fmt(9200), sub: "Expected next 30 days", icon: CircleDollarSign, accent: "border-l-violet-500" },
  ]

  const traderStats = [
    { label: "Active RFQs", value: "7", sub: "2 quotes pending", icon: ShoppingCart, accent: "border-l-emerald-500" },
    { label: "Open Orders", value: "4", sub: "$82,400 total value", icon: Package, accent: "border-l-amber-500" },
    { label: "Shipments", value: "3", sub: "1 in transit", icon: Ship, accent: "border-l-blue-500" },
    { label: "Saved Suppliers", value: "12", sub: "Across 6 countries", icon: Users, accent: "border-l-violet-500" },
  ]

  const stats = isInvestor ? investorStats : traderStats

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="relative space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Live Portal</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-heading font-bold">
            Welcome back 👋
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg">
            Your {me?.accountType || "trade"} portal is live. Monitor your activity, manage documents, and grow your global trade.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            {isInvestor ? (
              <Link href="/invest"><Button className="gap-2 bg-primary hover:bg-primary/90"><TrendingUp className="w-4 h-4" /> Browse Investments</Button></Link>
            ) : (
              <Link href="/wholesale"><Button className="gap-2 bg-primary hover:bg-primary/90"><Globe className="w-4 h-4" /> Wholesale Market</Button></Link>
            )}
            <Link href="/ai"><Button variant="outline" className="gap-2 border-accent/40 text-accent hover:bg-accent/10"><Brain className="w-4 h-4" /> AI Assistant</Button></Link>
          </div>
        </div>
      </div>

      {/* Profile + KYC completion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-border/60 bg-card/80">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Activity className="w-4 h-4 text-emerald-500" /> Profile Completion
              </div>
              <span className="text-sm font-bold text-emerald-500">{profilePct}%</span>
            </div>
            <Progress value={profilePct} className="h-2" />
            <p className="text-xs text-muted-foreground">Complete your profile to unlock all platform features.</p>
            <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => {}}>
              Complete Profile <ArrowRight className="w-3 h-3" />
            </Button>
          </CardContent>
        </Card>

        <Card className={`border-border/60 bg-card/80 ${me?.kycStatus === "verified" ? "border-emerald-500/20" : "border-amber-500/20"}`}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4 text-amber-500" /> KYC Verification
              </div>
              <Badge variant="outline" className={
                me?.kycStatus === "verified" ? "border-emerald-500/50 text-emerald-500" :
                me?.kycStatus === "pending" ? "border-amber-500/50 text-amber-500" :
                "border-red-500/50 text-red-500"
              }>
                {me?.kycStatus ?? "Not Started"}
              </Badge>
            </div>
            <Progress value={kycPct} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {me?.kycStatus === "verified"
                ? "KYC verified. You have full platform access."
                : "Submit KYC documents to unlock buying, selling, and investing."}
            </p>
            {me?.kycStatus !== "verified" && (
              <Button size="sm" variant="outline" className="w-full gap-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10">
                Complete KYC <ChevronRight className="w-3 h-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* Quick Actions */}
      <div className="space-y-3">
        <h3 className="text-lg font-heading font-semibold">Quick Actions</h3>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(action => (
            <Link key={action.href} href={action.href}>
              <div className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/60 bg-card/60 hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer group text-center">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center group-hover:scale-110 transition-transform">
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                </div>
                <span className="text-xs font-medium leading-tight">{action.label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Activity className="w-4 h-4 text-primary" /> Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground">All <ChevronRight className="w-3 h-3" /></Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            {RECENT_ACTIVITY.map(item => (
              <div key={item.id} className="py-3 flex items-start gap-3">
                <StatusIcon status={item.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.desc}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{item.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/80">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-heading flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" /> Notifications
                <Badge className="ml-1 bg-amber-500 text-white text-[10px] px-1.5 py-0 h-4">2</Badge>
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground" onClick={() => {}}>All <ChevronRight className="w-3 h-3" /></Button>
            </div>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            {NOTIFICATIONS_PREVIEW.map(n => (
              <div key={n.id} className={`py-3 flex items-start gap-3 ${n.unread ? "" : "opacity-60"}`}>
                {n.unread && <div className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />}
                {!n.unread && <div className="w-2 h-2 mt-1.5 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.msg}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{n.time}</span>
              </div>
            ))}
            <div className="pt-3">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">View all notifications</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform modules */}
      <div className="space-y-3">
        <h3 className="text-lg font-heading font-semibold">Platform Overview</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {PLATFORM_MODULES.map(m => (
            <Link key={m.href} href={m.href}>
              <Card className="hover:border-primary/40 hover:bg-primary/5 transition-all cursor-pointer border-border/60 group">
                <CardContent className="p-5 space-y-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <m.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{m.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.desc}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">{m.stat}</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
