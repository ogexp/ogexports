import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { Link } from "wouter"
import { useCurrency } from "@/lib/use-currency"
import { useLocalAuth } from "@/lib/local-auth"
import { api } from "@/lib/api"
import { kycDashboardBadge } from "@/lib/kyc-badge"
import { SupplierPortalLayout } from "@/components/supplier/SupplierPortalLayout"
import { RecentAlertsCard } from "@/components/portal/RecentAlertsCard"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2, Clock, XCircle, PauseCircle, PlusCircle, ClipboardList,
  Package, MessageSquare, Star, ArrowRight, TrendingUp, DollarSign,
  BarChart2, ShieldCheck, Award, Layers, Eye, AlertTriangle, Percent,
  Box, FileText, Loader2,
} from "lucide-react"

type PortfolioOffer = {
  id: number | string
  product_name: string
  category: string
  origin: string
  status: "approved" | "pending" | "hold" | "rejected" | string
  available_qty: string
  price_fob: string
  currency?: string
  payment_terms?: string
  lead_time?: string
  certifications?: string[]
  rating?: number | null
  submitted_at?: string
  line_value: number
  line_value_usd?: number
  line_value_pkr?: number
  display_line_value?: number
  exchange_rate?: number
  portfolio_pct?: number
  notes?: Array<{ text: string; at?: string }>
}

type DashboardPayload = {
  supplier?: {
    name?: string
    company_name?: string | null
    country?: string | null
    currency?: string
    kyc_status?: string
    rating?: number | null
  }
  kpis?: {
    total_supply_value?: number
    approved_value?: number
    pending_value?: number
    hold_value?: number
    offer_count?: number
    approved_count?: number
    pending_count?: number
    hold_count?: number
    rejected_count?: number
    approval_rate_pct?: number
    avg_rating?: number | null
  }
  status_distribution?: Array<{ status: string; count: number; pct: number }>
  value_by_category?: Array<{ category: string; value: number; pct: number }>
  portfolio?: PortfolioOffer[]
  certifications?: string[]
  highlights?: {
    most_valuable?: { product_name?: string; value?: number } | null
    largest_qty?: { available_qty?: string; product_name?: string } | null
    best_rated?: { product_name?: string; rating?: number } | null
    payment_terms?: string | null
  }
  notices?: Array<{ text: string; type: string; time?: string }>
}

const S_CFG = {
  approved: { label: "Approved",     bg: "bg-emerald-500/15", text: "text-emerald-600", border: "border-emerald-500/30", dot: "bg-emerald-500", icon: CheckCircle2,  bar: "#10b981" },
  pending:  { label: "Under Review", bg: "bg-amber-500/15",   text: "text-amber-600",   border: "border-amber-500/30",   dot: "bg-amber-500",   icon: Clock,         bar: "#f59e0b" },
  hold:     { label: "On Hold",      bg: "bg-blue-500/15",    text: "text-blue-600",    border: "border-blue-500/30",    dot: "bg-blue-500",    icon: PauseCircle,   bar: "#3b82f6" },
  rejected: { label: "Not Accepted", bg: "bg-red-500/15",     text: "text-red-600",     border: "border-red-500/30",     dot: "bg-red-500",     icon: XCircle,       bar: "#ef4444" },
} as const

function StatusPill({ status }: { status: string }) {
  const c = S_CFG[status as keyof typeof S_CFG] || S_CFG.pending
  const Icon = c.icon
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${c.bg} ${c.text} ${c.border}`}>
      <Icon className="w-3 h-3" /> {c.label}
    </span>
  )
}

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  )
}

const NOTICE_STYLE: Record<string, { color: string; dot: string }> = {
  approved: { color: "border-emerald-500/40 bg-emerald-500/5", dot: "bg-emerald-500" },
  hold:     { color: "border-blue-500/40 bg-blue-500/5",       dot: "bg-blue-500" },
  pending:  { color: "border-amber-500/40 bg-amber-500/5",     dot: "bg-amber-500" },
  rejected: { color: "border-red-500/40 bg-red-500/5",         dot: "bg-red-500" },
}

export default function SupplierDashboard() {
  const c = useCurrency()
  const { user } = useLocalAuth()
  const fmt = (n: number) => c.fmtNative(n)

  const { data, isLoading } = useQuery({
    queryKey: ["supplier-dashboard"],
    queryFn: async () => {
      const res = await api.get<{ data: DashboardPayload }>("/api/supplier/dashboard")
      return (res as any)?.data ?? res
    },
  })

  const kpis = data?.kpis
  const offers = data?.portfolio || []
  const totalValue = kpis?.total_supply_value ?? 0
  const approvedValue = kpis?.approved_value ?? 0
  const pendingValue = kpis?.pending_value ?? 0
  const holdValue = kpis?.hold_value ?? 0
  const approvalRate = kpis?.approval_rate_pct ?? 0
  const avgRating = kpis?.avg_rating != null ? String(kpis.avg_rating) : "—"
  const offerDisplayValue = (offer: PortfolioOffer) =>
    Number(offer.display_line_value ?? (c.isPK ? offer.line_value_pkr : offer.line_value_usd) ?? offer.line_value) || 0
  const maxVal = Math.max(1, ...offers.map(offerDisplayValue))
  const statusCounts = useMemo(() => {
    const m: Record<string, number> = { approved: 0, pending: 0, hold: 0, rejected: 0 }
    ;(data?.status_distribution || []).forEach((s: { status: string; count: number }) => {
      if (m[s.status] !== undefined) m[s.status] = s.count
    })
    return m
  }, [data?.status_distribution])

  const categories = data?.value_by_category || []
  const certifications = data?.certifications || []
  const notices = data?.notices || []
  const highlights = data?.highlights

  const displayName = data?.supplier?.company_name || data?.supplier?.name || user?.companyName || user?.fullName || "Supplier"
  const kycBadge = kycDashboardBadge(data?.supplier?.kyc_status)

  if (isLoading) {
    return (
      <SupplierPortalLayout title="Supplier Dashboard" subtitle="Track your supply performance & offer portfolio">
        <div className="flex items-center justify-center py-24 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading dashboard…
        </div>
      </SupplierPortalLayout>
    )
  }

  return (
    <SupplierPortalLayout title="Supplier Dashboard" subtitle="Track your supply performance & offer portfolio">
      <div className="space-y-6 max-w-7xl mx-auto">

        <div className="relative overflow-hidden rounded-2xl p-6 text-white"
          style={{ background: "linear-gradient(135deg, #0a2a1e 0%, #0F3D2E 55%, #0F3D2E 100%)" }}>
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: "radial-gradient(circle at 80% 50%, #C6A969 0%, transparent 60%)" }} />
          <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-white/20"
                style={{ background: "rgba(255,255,255,0.12)" }}>
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-white/60 text-xs font-medium mb-0.5">Good day,</p>
                <h2 className="text-xl font-heading font-bold">{displayName}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${kycBadge.className}`}>
                    {kycBadge.label}
                  </span>
                  <span className="text-white/50 text-xs">
                    Portfolio: {fmt(totalValue)} total supply value · {c.symLabel}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <Button asChild size="sm" className="border-white/30 text-white bg-white/15 hover:bg-white/25 border">
                <Link href="/supplier/my-offers"><ClipboardList className="w-3.5 h-3.5 mr-1.5" />My Offers</Link>
              </Button>
              <Button asChild size="sm" className="text-white border-0 font-bold"
                style={{ background: "linear-gradient(135deg, #C6A969, #e2c97e)" }}>
                <Link href="/supplier/submit-offer"><PlusCircle className="w-3.5 h-3.5 mr-1.5" />Submit Offer</Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            {
              label: "Total Supply Value",
              value: fmt(totalValue),
              icon: DollarSign,
              color: "#C6A969",
              bg: "rgba(198,169,105,0.12)",
              sub: `${kpis?.offer_count ?? 0} offers`,
            },
            {
              label: "Approved Value",
              value: fmt(approvedValue),
              icon: CheckCircle2,
              color: "#10b981",
              bg: "rgba(16,185,129,0.1)",
              sub: `${statusCounts.approved} offer${statusCounts.approved !== 1 ? "s" : ""}`,
            },
            {
              label: "Under Review",
              value: fmt(pendingValue),
              icon: Clock,
              color: "#f59e0b",
              bg: "rgba(245,158,11,0.1)",
              sub: `${statusCounts.pending} pending`,
            },
            {
              label: "On Hold",
              value: fmt(holdValue),
              icon: PauseCircle,
              color: "#3b82f6",
              bg: "rgba(59,130,246,0.1)",
              sub: `${statusCounts.hold} offer${statusCounts.hold !== 1 ? "s" : ""}`,
            },
            {
              label: "Approval Rate",
              value: `${approvalRate}%`,
              icon: Percent,
              color: "#2d7a4f",
              bg: "rgba(168,85,247,0.1)",
              sub: "of submitted",
            },
            {
              label: "Avg Quality Rating",
              value: avgRating === "—" ? "—" : `${avgRating}/5`,
              icon: Star,
              color: "#C6A969",
              bg: "rgba(198,169,105,0.12)",
              sub: "by OG team",
            },
          ].map(({ label, value, icon: Icon, color, bg, sub }) => (
            <Card key={label} className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg }}>
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                </div>
                <div className="text-xl font-heading font-bold text-foreground">{value}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</div>
                <div className="text-[10px] mt-1" style={{ color }}>{sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-emerald-700" />
                    Offer Portfolio — Supply Value Breakdown
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-xs h-7">
                    <Link href="/supplier/my-offers" className="flex items-center gap-1">
                      View all <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  {offers.map((offer, i) => {
                    const val = offerDisplayValue(offer)
                    const pct = offer.portfolio_pct ?? (totalValue ? Math.round((val / totalValue) * 100) : 0)
                    const barPct = Math.round((val / maxVal) * 100)
                    const cfg = S_CFG[offer.status as keyof typeof S_CFG] || S_CFG.pending
                    return (
                      <div key={offer.id} className="px-5 py-4 hover:bg-muted/30 transition-colors group">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 bg-emerald-700/10 text-xs font-bold text-emerald-700">
                              {i + 1}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{offer.product_name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] font-mono text-muted-foreground">#{offer.id}</span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground">{offer.category}</span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground">{offer.origin}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-base font-heading font-bold" style={{ color: "#C6A969" }}>{fmt(val)}</div>
                            <div className="text-[10px] text-muted-foreground">{pct}% of portfolio</div>
                          </div>
                        </div>
                        <div className="mb-3">
                          <MiniBar pct={barPct} color={cfg.bar} />
                        </div>
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1"><Box className="w-3 h-3" />{offer.available_qty}</span>
                            <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />{offer.price_fob}</span>
                            {offer.lead_time && (
                              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{offer.lead_time}</span>
                            )}
                            {offer.rating != null && (
                              <span className="flex items-center gap-1 text-yellow-500">
                                <Star className="w-3 h-3 fill-yellow-500" />
                                {offer.rating}/5 rated
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <StatusPill status={offer.status} />
                            <Button variant="ghost" size="icon" className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity" asChild>
                              <Link href="/supplier/my-offers"><Eye className="w-3.5 h-3.5" /></Link>
                            </Button>
                          </div>
                        </div>
                        {(offer.notes?.length ?? 0) > 0 && (
                          <div className="mt-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/40">
                            <FileText className="w-3 h-3 shrink-0 mt-0.5 text-muted-foreground" />
                            <p className="text-[10px] text-muted-foreground leading-relaxed">{offer.notes![0].text}</p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  {offers.length === 0 && (
                    <div className="py-12 text-center text-sm text-muted-foreground">
                      No offers yet. <Link href="/supplier/submit-offer" className="text-emerald-700 hover:underline">Submit your first offer</Link>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  Certifications Across Offers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-2">
                  {certifications.map(cert => (
                    <span key={cert}
                      className="px-3 py-1.5 rounded-full text-[11px] font-semibold border"
                      style={{ background: "rgba(16,185,129,0.08)", color: "#10b981", borderColor: "rgba(16,185,129,0.2)" }}>
                      ✓ {cert}
                    </span>
                  ))}
                  {certifications.length === 0 && (
                    <p className="text-sm text-muted-foreground">No certifications listed yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <RecentAlertsCard
              apiBase="/api/notifications"
              listHref="/supplier/notifications"
              limit={5}
            />
            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Status Distribution
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {(["approved", "pending", "hold", "rejected"] as const).map(st => {
                  const cfg = S_CFG[st]
                  const cnt = statusCounts[st]
                  const pct = (kpis?.offer_count ?? 0) ? Math.round((cnt / (kpis?.offer_count || 1)) * 100) : 0
                  return (
                    <div key={st}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                          <span className="text-xs text-muted-foreground">{cfg.label}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-foreground">{cnt}</span>
                          <span className="text-[10px] text-muted-foreground ml-1">({pct}%)</span>
                        </div>
                      </div>
                      <MiniBar pct={pct} color={cfg.bar} />
                    </div>
                  )
                })}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-700" />
                  Value by Category
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                {categories.map((row) => (
                  <div key={row.category}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-muted-foreground">{row.category}</span>
                      <div className="text-right">
                        <span className="text-xs font-bold" style={{ color: "#C6A969" }}>{fmt(row.value)}</span>
                        <span className="text-[10px] text-muted-foreground ml-1">({row.pct}%)</span>
                      </div>
                    </div>
                    <MiniBar pct={row.pct} color="#C6A969" />
                  </div>
                ))}
                {categories.length === 0 && <p className="text-sm text-muted-foreground">No data yet.</p>}
              </CardContent>
            </Card>

            <Card className="glass-card overflow-hidden">
              <div className="p-5" style={{ background: "linear-gradient(135deg, #0a2a1e 0%, #0F3D2E 100%)" }}>
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-yellow-300" />
                  <span className="text-xs font-semibold text-white/80">Total Supply Portfolio</span>
                </div>
                <div className="text-3xl font-heading font-bold text-white mb-1">{fmt(totalValue)}</div>
                <div className="text-xs text-white/60">Across {kpis?.offer_count ?? 0} active offer{(kpis?.offer_count ?? 0) !== 1 ? "s" : ""}</div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-2.5 bg-white/10">
                    <div className="text-base font-bold text-emerald-300">{fmt(approvedValue)}</div>
                    <div className="text-[9px] text-white/60 mt-0.5">Approved</div>
                  </div>
                  <div className="rounded-xl p-2.5 bg-white/10">
                    <div className="text-base font-bold text-amber-300">{fmt(pendingValue)}</div>
                    <div className="text-[9px] text-white/60 mt-0.5">In Review</div>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-1.5">
                {[
                  { href: "/supplier/submit-offer", icon: PlusCircle,    label: "Submit New Offer",   desc: "Add a product offer",        color: "text-emerald-700", bg: "bg-emerald-700/10" },
                  { href: "/supplier/my-offers",    icon: ClipboardList, label: "Manage My Offers",   desc: "Track & review statuses",    color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { href: "/supplier/messages",     icon: MessageSquare, label: "Messages",            desc: "Chat with OGSupport",        color: "text-blue-500", bg: "bg-blue-500/10" },
                  { href: "/supplier/profile",      icon: ShieldCheck,   label: "Documents & Profile", desc: "Upload KYC documents",      color: "text-amber-500", bg: "bg-amber-500/10" },
                ].map(({ href, icon: Icon, label, desc, color, bg }) => (
                  <Link key={href} href={href}>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted/60 transition-colors cursor-pointer group">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${bg}`}>
                        <Icon className={`w-4 h-4 ${color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-foreground">{label}</p>
                        <p className="text-[10px] text-muted-foreground">{desc}</p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Important Notices
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 space-y-2">
                {notices.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-3">No notices yet. Status updates will appear here.</p>
                )}
                {notices.map((n, i) => {
                  const st = NOTICE_STYLE[n.type] || NOTICE_STYLE.pending
                  return (
                    <div key={i} className={`rounded-xl border px-3 py-2.5 ${st.color}`}>
                      <div className="flex items-start gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${st.dot}`} />
                        <div>
                          <p className="text-[11px] leading-relaxed text-foreground/80">{n.text}</p>
                          {n.time && <p className="text-[9px] text-muted-foreground mt-0.5">{n.time}</p>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Most Valuable Offer", value: highlights?.most_valuable?.product_name ?? "—", icon: Award, color: "#C6A969" },
            { label: "Largest Qty Available", value: highlights?.largest_qty?.available_qty ?? "—", icon: Box, color: "#2d7a4f" },
            { label: "Best Price Rated", value: highlights?.best_rated?.product_name ?? "Not yet rated", icon: Star, color: "#f59e0b" },
            { label: "Payment Terms", value: highlights?.payment_terms ?? "—", icon: DollarSign, color: "#10b981" },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="glass-card">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}18` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
                  <p className="text-xs font-semibold text-foreground truncate">{value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </SupplierPortalLayout>
  )
}
