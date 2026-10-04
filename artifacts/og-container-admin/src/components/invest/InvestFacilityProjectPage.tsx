import { useState, useEffect, useMemo } from "react"
import { useCurrency } from "@/lib/use-currency"
import { InvestPortalLayout } from "@/components/invest/InvestPortalLayout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import {
  Factory, TrendingUp, Package, DollarSign, Calendar, CheckCircle2, Clock,
  Download, Gauge, Leaf, ShieldCheck, ChevronRight, FileText, Wrench,
  CalendarClock, HandCoins, Mail, CircleHelp,
} from "lucide-react"
import { InvestNowModal } from "@/components/invest/InvestNowModal"
import type { LongTermProject } from "@/data/investments"
import type { FacilityCmsContent, InvestFacilityConfig } from "@/data/invest-facility-config"
import { mergeFacilityConfig } from "@/lib/facility-content-sync"
import { useLocalAuth } from "@/lib/local-auth"
import { useToast } from "@/hooks/use-toast"
import { api, resolveMediaUrl } from "@/lib/api"

const DEFAULT_PROTECTIONS = [
  { value: "Quarterly", label: "profit distribution" },
  { value: "Audited", label: "financial reporting" },
  { value: "Digital", label: "investment certificates" },
  { value: "24 / 7", label: "investor support" },
]

const STAT_ICONS = [Gauge, Factory, DollarSign, TrendingUp] as const

type ApiFacilityProject = {
  id: number
  title: string
  reference?: string | null
  image_url?: string | null
  description?: string | null
  target_amount: number
  raised_amount: number
  min_investment: number
  max_investment: number | null
  expected_return_pct: number
  roi_label?: string | null
  funding_percentage?: number
  remaining_amount: number
  pending_reserved: number
  is_full: boolean
  status: string
  etd?: string | null
  eta?: string | null
  meta?: {
    facility_code?: string
    timeline?: string
    completion?: string
    sort_order?: number
  } | null
}

type FacilityInvestSelection = LongTermProject & {
  pendingReserved?: number
  remainingAmount?: number
  isFull?: boolean
}

const STATUS_META: Record<string, { label: string; cls: string }> = {
  funding:   { label: "Funding Open", cls: "bg-blue-500/15 text-blue-600" },
  ready_to_ship: { label: "In Progress", cls: "bg-emerald-500/15 text-emerald-600" },
  active:    { label: "In Progress",  cls: "bg-emerald-500/15 text-emerald-600" },
  shipping:  { label: "In Progress",  cls: "bg-emerald-500/15 text-emerald-600" },
  completed: { label: "Completed",    cls: "bg-muted text-muted-foreground" },
  partial:   { label: "In Progress",  cls: "bg-amber-500/15 text-amber-600" },
  planned:   { label: "Planned",      cls: "bg-amber-500/15 text-amber-600" },
  operational: { label: "Operational", cls: "bg-emerald-500/15 text-emerald-600" },
}

function downloadFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatTimeline(project: ApiFacilityProject): string {
  const metaTimeline = project.meta?.timeline?.trim()
  if (metaTimeline) return metaTimeline
  if (project.etd || project.eta) {
    const start = project.etd || "—"
    const end = project.eta || "—"
    return `${start} — ${end}`
  }
  const completion = project.meta?.completion?.trim()
  if (completion) return completion
  return "—"
}

function formatRoi(project: ApiFacilityProject): string {
  const label = project.roi_label?.trim()
  if (label) return label.replace(/\s*annual$/i, "").trim() || label
  if (project.expected_return_pct != null && Number.isFinite(Number(project.expected_return_pct))) {
    return `${Number(project.expected_return_pct)}%`
  }
  return "—"
}

function fundingPctFor(project: ApiFacilityProject): number {
  if (project.funding_percentage != null && Number.isFinite(Number(project.funding_percentage))) {
    return Math.min(100, Math.round(Number(project.funding_percentage)))
  }
  if (project.target_amount > 0) {
    return Math.min(100, Math.round((project.raised_amount / project.target_amount) * 100))
  }
  return 0
}

function buildProjectFromApi(
  api: ApiFacilityProject,
  category: InvestFacilityConfig["investCategory"],
): FacilityInvestSelection {
  return {
    id: api.id,
    slug: String(api.id),
    name: api.title,
    category,
    shortDescription: api.description || "",
    fullDescription: api.description || "",
    fundingTarget: Number(api.target_amount) || 0,
    currentFunding: Number(api.raised_amount) || 0,
    minInvestment: Number(api.min_investment) || 0,
    maxInvestment: api.max_investment != null ? Number(api.max_investment) : 250000,
    investmentPeriodMonths: 60,
    expectedReturnPct: Number(api.expected_return_pct) || 0,
    expectedCompletionDate: api.meta?.completion || api.eta || "2027-12-31",
    riskLevel: "medium",
    status: api.status === "completed" ? "completed" : "open",
    totalInvestors: 0,
    imageUrls: api.image_url ? [resolveMediaUrl(api.image_url)] : [],
    highlights: [],
    documents: [],
    pendingReserved: api.pending_reserved ?? 0,
    remainingAmount: api.remaining_amount,
    isFull: api.is_full ?? false,
  }
}

interface InvestFacilityProjectPageProps {
  config: InvestFacilityConfig
}

export function InvestFacilityProjectPage({ config }: InvestFacilityProjectPageProps) {
  const c = useCurrency()
  const { toast } = useToast()
  const { user: localUser } = useLocalAuth()
  const [activeTab, setActiveTab] = useState<"overview" | "stages" | "expansion" | "timeline">("overview")
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedProject, setSelectedProject] = useState<FacilityInvestSelection | null>(null)
  const [apiProjects, setApiProjects] = useState<ApiFacilityProject[]>([])
  const [projectsLoading, setProjectsLoading] = useState(true)
  const [remoteContent, setRemoteContent] = useState<FacilityCmsContent>({})

  useEffect(() => {
    if (!config.apiProjectType) return
    api.get(`/api/investor/facility-content/${config.apiProjectType}`)
      .then((res: any) => {
        const data = res?.data
        if (data && typeof data === "object") setRemoteContent(data)
        else setRemoteContent({})
      })
      .catch(() => setRemoteContent({}))
  }, [config.apiProjectType])

  const mergedConfig = useMemo(
    () => mergeFacilityConfig(config, remoteContent),
    [config, remoteContent],
  )

  const investorProtections = mergedConfig.investorProtections?.length
    ? mergedConfig.investorProtections
    : DEFAULT_PROTECTIONS

  useEffect(() => {
    if (!config.apiProjectType) {
      setProjectsLoading(false)
      return
    }
    setProjectsLoading(true)
    api.get(`/api/investor/projects?type=${config.apiProjectType}&per_page=50`)
      .then((res: any) => {
        const rows = res?.data ?? res
        const list = Array.isArray(rows) ? rows : (rows?.data ?? [])
        setApiProjects(list)
      })
      .catch(() => setApiProjects([]))
      .finally(() => setProjectsLoading(false))
  }, [config.apiProjectType])

  function canInvest(project: ApiFacilityProject): boolean {
    return (project.status === "pending" || project.status === "funding") && !project.is_full
  }

  const stats = mergedConfig.stats.map((s, i) => ({
    ...s,
    icon: STAT_ICONS[i] ?? Gauge,
  }))

  const featuredImageUrl = useMemo(() => {
    const withImage = apiProjects.find(p => p.image_url)
    return withImage?.image_url ? resolveMediaUrl(withImage.image_url) : null
  }, [apiProjects])

  const featuredProjectCode = useMemo(() => {
    const withRef = apiProjects.find(p => p.reference)
    return withRef?.reference || mergedConfig.projectCode
  }, [apiProjects, mergedConfig.projectCode])

  function openInvestModal(project: ApiFacilityProject) {
    if (!localUser) {
      toast({ title: "Login Required", description: "Please sign in with an investor account to invest.", variant: "destructive" })
      return
    }
    if (localUser.accountType !== "investor") {
      toast({ title: "Investor Account Required", description: "Please switch to an investor account.", variant: "destructive" })
      return
    }
    if (project.status !== "pending" && project.status !== "funding" || project.is_full) {
      toast({ title: "Fully subscribed", description: "This opportunity has reached its funding target.", variant: "destructive" })
      return
    }
    setSelectedProject(buildProjectFromApi(project, config.investCategory))
    setModalOpen(true)
  }

  function openFirstOpportunity() {
    const first = apiProjects.find(p => canInvest(p))
    if (first) {
      openInvestModal(first)
      return
    }
    if (!projectsLoading) {
      toast({ title: "Not available", description: "No open investment opportunities right now.", variant: "destructive" })
    }
  }

  return (
    <>
      <InvestPortalLayout title={mergedConfig.layoutTitle} subtitle={mergedConfig.layoutSubtitle}>
        <div className="space-y-8">

          {/* Hero */}
          <Card className="glass-card border-emerald-500/20 overflow-hidden">
            {featuredImageUrl && (
              <div className="h-48 sm:h-56 w-full overflow-hidden">
                <img src={featuredImageUrl} alt={mergedConfig.layoutTitle} className="w-full h-full object-cover" />
              </div>
            )}
            <CardContent className="p-6 sm:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="max-w-2xl">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="grid h-6 w-6 place-items-center rounded bg-emerald-500/15 text-emerald-600">
                      <Leaf className="w-3.5 h-3.5" />
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                      {mergedConfig.hero.eyebrow}
                    </span>
                  </div>
                  <h2 className="font-heading text-2xl sm:text-3xl font-bold leading-tight mb-3">
                    {mergedConfig.hero.title}
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {mergedConfig.hero.description}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button size="sm" onClick={openFirstOpportunity}>
                    <HandCoins className="w-3.5 h-3.5 mr-1.5" /> {mergedConfig.hero.investCta}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => downloadFile(mergedConfig.downloadFilename, mergedConfig.downloadContents)}>
                    <Download className="w-3.5 h-3.5 mr-1.5" /> {mergedConfig.hero.downloadCta}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => toast({ title: "Meeting Requested", description: "Our investment team will confirm a time shortly." })}>
                    <CalendarClock className="w-3.5 h-3.5 mr-1.5" /> {mergedConfig.hero.meetingCta}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map(s => (
              <Card key={s.label} className="glass-card hover:border-accent/30 transition-colors">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                    <span className="text-xs text-muted-foreground">{s.change}</span>
                  </div>
                  <p className="text-2xl font-heading font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Utilization + Overview */}
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card className="glass-card border-emerald-500/20">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-heading font-bold text-base flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-accent" /> {mergedConfig.utilizationTitle || "Plant Utilization"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Current vs. installed capacity</p>
                  </div>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-xs">{mergedConfig.utilizationBadge}</Badge>
                </div>
                <div className="space-y-4">
                  {mergedConfig.utilizationRows.map(item => (
                    <div key={item.label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-muted-foreground">{item.label}</span>
                        <span className="font-semibold">{item.value} <span className="text-accent">({item.pct}%)</span></span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all" style={{ width: `${item.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle className="font-heading text-base">Project Overview</CardTitle>
                  <Badge className="bg-emerald-500/15 text-emerald-600 border-0 text-[10px]">{mergedConfig.projectStatus}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{mergedConfig.overviewTitle}</p>
              </CardHeader>
              <CardContent>
                <div className="mb-4 p-3 rounded-lg bg-accent/10 border border-accent/20 text-right">
                  <p className="text-[10px] text-muted-foreground">Project code</p>
                  <p className="font-mono text-sm font-semibold text-accent">{featuredProjectCode}</p>
                </div>
                <div className="space-y-3">
                  {mergedConfig.overviewDetails.slice(0, 5).map(d => (
                    <div key={d.label}>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{d.label}</p>
                      <p className="text-sm font-medium mt-0.5">{d.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tab nav */}
          <div className="flex flex-wrap gap-1 bg-muted/50 p-1 rounded-xl w-fit">
            {[
              { key: "overview",  label: "Production" },
              { key: "stages",    label: "Processing Stages" },
              { key: "expansion", label: "Investment Opportunities" },
              { key: "timeline",  label: "Project Timeline" },
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

          {/* Production tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg">Monthly Production & Revenue</CardTitle>
                  <p className="text-xs text-muted-foreground">Projected output and revenue generated</p>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={mergedConfig.productionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="facRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#16a34a" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="facProfGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#C6A969" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#C6A969" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} tickFormatter={v => c.tickFmt(v)} />
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }} formatter={(v: number, name: string) => [name === "output" ? `${v} T/day` : c.fmtDual(v as number), ""]} />
                      <Area type="monotone" dataKey="revenue" stroke="#16a34a" strokeWidth={2} fill="url(#facRevGrad)" name="Revenue" />
                      <Area type="monotone" dataKey="profit" stroke="#C6A969" strokeWidth={2} fill="url(#facProfGrad)" name="Profit" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="glass-card">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-heading text-lg">Operational Updates</CardTitle>
                    <p className="text-xs text-muted-foreground">Latest milestones, reports and activity</p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => downloadFile(mergedConfig.downloadFilename, mergedConfig.downloadContents)}>
                    <Download className="w-3.5 h-3.5 mr-1.5" /> Full Report
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {mergedConfig.operationalUpdates.map((u, i) => (
                      <div key={i} className="flex items-start gap-4 px-5 py-4 hover:bg-muted/20 transition-colors">
                        <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">{u.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{u.desc}</p>
                        </div>
                        <p className="text-xs text-muted-foreground shrink-0">{u.date}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Processing Stages tab */}
          {activeTab === "stages" && (
            <div className="grid md:grid-cols-2 gap-4">
              {mergedConfig.processingStages.map(stage => {
                const meta = STATUS_META[stage.status] || STATUS_META.planned
                return (
                  <Card key={stage.id} className="glass-card hover:shadow-md transition-all">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent font-bold text-sm">
                          {stage.id}
                        </span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-bold">Stage {stage.id}: {stage.label}</span>
                            <Badge className={`text-[10px] border-0 ${meta.cls}`}>{meta.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">{stage.desc}</p>
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-accent" />
                            <span className="text-xs font-semibold text-accent">{stage.capacity}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Investment Opportunities tab */}
          {activeTab === "expansion" && (
            <div className="space-y-5">
              {projectsLoading && (
                <div className="space-y-4">
                  {[1, 2].map(i => (
                    <Card key={i} className="glass-card animate-pulse">
                      <CardContent className="p-6 space-y-4">
                        <div className="h-5 w-2/3 rounded bg-muted" />
                        <div className="h-3 w-full rounded bg-muted" />
                        <div className="h-2.5 w-full rounded bg-muted" />
                        <div className="grid grid-cols-3 gap-4">
                          <div className="h-14 rounded bg-muted" />
                          <div className="h-14 rounded bg-muted" />
                          <div className="h-14 rounded bg-muted" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {!projectsLoading && apiProjects.length === 0 && (
                <Card className="glass-card">
                  <CardContent className="p-10 text-center">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="font-heading font-bold text-base mb-1">No opportunities available yet</p>
                    <p className="text-sm text-muted-foreground">
                      New investment opportunities for this facility will appear here when published by the platform.
                    </p>
                  </CardContent>
                </Card>
              )}
              {!projectsLoading && apiProjects.map(p => {
                const fundingPct = fundingPctFor(p)
                const statusKey = p.status === "funding" ? "funding" : (STATUS_META[p.status] ? p.status : "active")
                const meta = STATUS_META[statusKey] || STATUS_META.active
                const investable = canInvest(p)
                return (
                  <Card key={p.id} className="glass-card hover:border-accent/30 transition-all overflow-hidden">
                    {p.image_url && (
                      <div className="h-40 w-full overflow-hidden">
                        <img
                          src={resolveMediaUrl(p.image_url)}
                          alt={p.title}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-5">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h3 className="font-heading font-bold text-base">{p.title}</h3>
                            <Badge className={`text-[10px] border-0 ${meta.cls}`}>{meta.label}</Badge>
                            {p.is_full && <Badge variant="outline" className="text-[10px]">Fully subscribed</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{p.description || "—"}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">Total CAPEX</p>
                          <p className="text-xl font-heading font-bold">{c.fmtDual(Number(p.target_amount) || 0)}</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-muted-foreground">Funding Progress</span>
                          <span className="font-bold text-accent">{fundingPct}%</span>
                        </div>
                        <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${fundingPct}%`, background: "linear-gradient(90deg, #0F3D2E, #4CAF50)" }} />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1.5">
                          {c.fmtDual(Number(p.remaining_amount) || 0)} remaining capacity
                        </p>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-5">
                        {[
                          { label: "Expected ROI", value: formatRoi(p), color: "text-accent" },
                          { label: "Min. Investment", value: c.fmtDual(Number(p.min_investment) || 0), color: "text-foreground" },
                          { label: "Timeline", value: formatTimeline(p), color: "text-foreground" },
                        ].map(item => (
                          <div key={item.label} className="p-3 rounded-lg bg-muted/40">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1">{item.label}</p>
                            <p className={`text-sm font-bold ${item.color}`}>{item.value}</p>
                          </div>
                        ))}
                      </div>
                      {p.status !== "completed" && (
                        <Button className="w-full sm:w-auto" size="sm" onClick={() => openInvestModal(p)} disabled={!investable}>
                          {investable ? "Invest in this opportunity" : "Not available"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Timeline tab */}
          {activeTab === "timeline" && (
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="font-heading text-lg flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-accent" /> {mergedConfig.timelineSubtitle}
                </CardTitle>
                <p className="text-xs text-muted-foreground">{mergedConfig.timelineTitle}</p>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {mergedConfig.timeline.map((item, i) => (
                    <div key={i} className="flex gap-4 pb-8 last:pb-0 relative">
                      {i < mergedConfig.timeline.length - 1 && (
                        <div className={`absolute left-5 top-10 bottom-0 w-0.5 ${item.done ? "bg-emerald-500/40" : "bg-border"}`} />
                      )}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 border-2 ${
                        item.done ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-500" : "bg-muted border-border text-muted-foreground"
                      }`}>
                        {item.done ? <CheckCircle2 className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 pt-1.5">
                        <div className="flex items-center gap-3 mb-1">
                          <Badge className={`text-[10px] border-0 ${item.done ? "bg-muted text-muted-foreground" : "bg-blue-500/15 text-blue-600"}`}>
                            {item.year} {item.q}
                          </Badge>
                          <h4 className="text-sm font-semibold">{item.label}</h4>
                        </div>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Allocation + Protections */}
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="font-heading text-base">Investment Allocation</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{mergedConfig.allocationTitle}</p>
                  </div>
                  <span className="text-sm font-mono text-accent">100%</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {mergedConfig.allocation.map(item => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-mono text-muted-foreground">{item.value} · {item.pct}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-accent/70" style={{ width: `${item.pct * 3}%` }} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/15 text-emerald-600">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <CardTitle className="font-heading text-base">Investor Protections</CardTitle>
                    <p className="text-xs text-muted-foreground">Built for transparent participation</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {investorProtections.map(item => (
                    <div key={item.label}>
                      <p className="font-heading text-lg font-bold text-emerald-700">{item.value}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Why this project + FAQ */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/15 text-accent">
                    <Wrench className="w-5 h-5" />
                  </span>
                  <div>
                    <CardTitle className="font-heading text-base">Why This Project</CardTitle>
                    <p className="text-xs text-muted-foreground">A durable operating thesis for the region</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {mergedConfig.whyThisProject.map(item => (
                    <div key={item.title}>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <CircleHelp className="w-5 h-5 text-accent" />
                  <div>
                    <CardTitle className="font-heading text-base">Investor FAQ</CardTitle>
                    <p className="text-xs text-muted-foreground">Clear answers before you commit</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible defaultValue="faq-0">
                  {mergedConfig.faqs.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`}>
                      <AccordionTrigger className="text-sm font-semibold text-left">{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Footer CTA */}
          <Card className="border-0 bg-gradient-to-br from-emerald-900 to-emerald-800 text-white">
            <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-300 mb-2">Next step</p>
                <h2 className="font-heading text-xl font-bold mb-2">{mergedConfig.footerCta.title}</h2>
                <p className="text-sm text-emerald-200/80">{mergedConfig.footerCta.description}</p>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                <Button variant="secondary" onClick={openFirstOpportunity}>
                  {mergedConfig.footerCta.investLabel} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
                <Button variant="outline" className="border-emerald-400/40 text-white hover:bg-emerald-700/50" onClick={() => toast({ title: "Message Sent", description: "The investment team will be in touch shortly." })}>
                  <Mail className="w-3.5 h-3.5 mr-1.5" /> {mergedConfig.footerCta.contactLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </InvestPortalLayout>

      {selectedProject && (
        <InvestNowModal
          investment={selectedProject}
          initialAmount={selectedProject.minInvestment}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          pendingReserved={selectedProject.pendingReserved}
          remainingAmount={selectedProject.remainingAmount}
          isFull={selectedProject.isFull}
          redirectTo="/invest/dashboard"
        />
      )}
    </>
  )
}
