import { useEffect, useMemo, useState } from "react"
import { Link } from "wouter"
import {
  Activity, BarChart3, CalendarDays, ClipboardList, DollarSign,
  FileText, Factory, Gauge, History, ImagePlus, Layers, Loader2, Plus, Save, Settings2, TrendingUp,
  Upload, Users, Video, X, type LucideIcon,
} from "lucide-react"
import {
  updateProjectAsync,
  saveFacilityContent,
  type AdminFacilityProjectStatus,
  type AdminInvestProject,
} from "@/lib/admin-data"
import { formatAdminUsd } from "@/lib/admin-currency"
import {
  compactFacilityContent,
  dashboardToFacilityContent,
} from "@/lib/facility-content-sync"
import type { FacilityCmsContent } from "@/data/invest-facility-config"
import { PLANT_CONFIG } from "@/data/invest-plant"
import { FEED_MILL_CONFIG } from "@/data/invest-feed-mill"
import { RICE_MILL_CONFIG } from "@/data/invest-rice-mill"

const EMERALD = "#0F3D2E"
const GREEN = "#4CAF50"
const GOLD = "#D4A012"

type FacilityType = "ricemill" | "feed" | "plant"
type FacilityStatus = Extract<AdminFacilityProjectStatus, "draft" | "coming_soon" | "funding" | "fully_funded" | "under_construction" | "operational" | "completed" | "closed">
type MilestoneStatus = "planned" | "in_progress" | "completed"
type ControlTab =
  | "overview"
  | "investments"
  | "progress"
  | "finance"
  | "updates"
  | "stats"
  | "utilization"
  | "production"
  | "stages"
  | "timeline"
  | "content"

type FacilityMilestone = {
  id: string
  name: string
  progress: number
  startDate: string
  expectedDate: string
  actualDate: string
  status: MilestoneStatus
  description: string
  capacity: string
  photos: string
  videos: string
  documents: string
}

type InvestmentPlan = {
  id: string
  name: string
  minInvestment: number
  maxInvestment: number | null
  roi: number
  durationYears: number
  active: boolean
}

type FinanceData = {
  landCost: number
  constructionCost: number
  machineryCost: number
  installationCost: number
  storageCost: number
  setupCost: number
  workingCapital: number
  operationalExpenses: number
  revenue: number
  profit: number
  investorCapital: number
  investorReturns: number
}

type FacilityUpdate = {
  id: string
  title: string
  description: string
  progress: number
  date: string
  photos: string
  videos: string
  documents: string
  published: boolean
}

type FacilityDashboard = {
  overview: {
    title?: string
    totalProjectCost: number
    fundingTarget: number
    constructionDuration: number
    projectStartDate: string
    expectedCompletionDate: string
    overallProgress: number
    statusLabel: string
  }
  milestones: FacilityMilestone[]
  investmentPlans: InvestmentPlan[]
  finance: FinanceData
  updates: FacilityUpdate[]
  pageContent: FacilityCmsContent
}

const STATUS_OPTIONS: FacilityStatus[] = [
  "funding", "coming_soon", "fully_funded", "under_construction", "operational", "completed",
]

const STATUS_LABELS: Record<FacilityStatus, string> = {
  draft: "Draft",
  coming_soon: "Coming Soon",
  funding: "Funding Open",
  fully_funded: "Fully Funded",
  under_construction: "Under Construction",
  operational: "Operational",
  completed: "Completed",
  closed: "Closed",
}

const RICE_MILESTONES = [
  "Land Acquisition", "Site Preparation", "Civil Construction",
  "Building Construction", "Machinery Procurement", "Machinery Installation",
  "Electrical & Mechanical Work", "Testing & Commissioning", "Trial Production",
  "Commercial Production", "Full Operations",
]

const FEED_MILESTONES = [
  "Land Preparation", "Civil Works", "Building Construction",
  "Machinery Procurement", "Machinery Installation", "Electrical Installation",
  "Production Line Installation", "Testing", "Trial Production",
  "Commercial Production", "Full Operations",
]

const PLANT_MILESTONES = [
  "Land & infrastructure", "Machinery import", "Phase 1 commissioning",
  "First export contract", "IQF line 1 installed", "Solar energy online",
  "IQF line 2", "Full capacity target",
]

const FINANCE_FIELDS: Array<{ key: keyof FinanceData; label: string }> = [
  { key: "landCost", label: "Land Cost" },
  { key: "constructionCost", label: "Construction Cost" },
  { key: "machineryCost", label: "Machinery Cost" },
  { key: "installationCost", label: "Installation Cost" },
  { key: "storageCost", label: "Storage Cost" },
  { key: "setupCost", label: "Raw Material Setup / Packaging Setup" },
  { key: "workingCapital", label: "Working Capital" },
  { key: "operationalExpenses", label: "Operational Expenses" },
]

const STAGE_STATUSES = ["operational", "partial", "planned", "funding", "completed"] as const

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {}
}

function numberValue(value: unknown, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function money(value: number) {
  return formatAdminUsd(value)
}

function statusLabel(status: string) {
  return STATUS_LABELS[status as FacilityStatus] || status.replace(/_/g, " ")
}

function blankMilestone(id: string, name = "New milestone"): FacilityMilestone {
  return {
    id, name, progress: 0, startDate: "", expectedDate: "", actualDate: "",
    status: "planned", description: "", capacity: "", photos: "", videos: "", documents: "",
  }
}

function defaultPageContent(type: FacilityType): FacilityCmsContent {
  const config = type === "plant" ? PLANT_CONFIG : type === "ricemill" ? RICE_MILL_CONFIG : FEED_MILL_CONFIG
  const marketing: FacilityCmsContent = {
    layoutTitle: config.layoutTitle,
    layoutSubtitle: config.layoutSubtitle,
    projectStatus: config.projectStatus,
    projectCode: config.projectCode,
    hero: { ...config.hero },
    overviewTitle: config.overviewTitle,
    overviewDetails: config.overviewDetails.map(d => ({ ...d })),
    allocation: config.allocation.map(a => ({ ...a })),
    allocationTitle: config.allocationTitle,
    whyThisProject: config.whyThisProject.map(w => ({ ...w })),
    faqs: config.faqs.map(f => ({ ...f })),
    footerCta: { ...config.footerCta },
    downloadFilename: config.downloadFilename,
    downloadContents: config.downloadContents,
  }

  // Plant uses explicit operational CMS fields. Rice/feed derive cards/chart/timeline from construction + finance unless overridden.
  if (type !== "plant") return marketing

  return {
    ...marketing,
    stats: config.stats.map(s => ({ ...s })),
    utilizationBadge: config.utilizationBadge,
    utilizationTitle: config.utilizationTitle || "Plant Utilization",
    utilizationRows: config.utilizationRows.map(r => ({ ...r })),
    processingStages: config.processingStages.map(s => ({ ...s })),
    timelineTitle: config.timelineTitle,
    timelineSubtitle: config.timelineSubtitle,
    timeline: config.timeline.map(t => ({ ...t })),
    productionData: config.productionData.map(p => ({ ...p })),
    operationalUpdates: config.operationalUpdates.map(u => ({ ...u })),
  }
}

function defaultDashboard(type: FacilityType, project: AdminInvestProject): FacilityDashboard {
  const isRice = type === "ricemill"
  const isPlant = type === "plant"
  const target = project.target || (isPlant ? 1200000 : isRice ? 1500000 : 900000)
  const names = isPlant ? PLANT_MILESTONES : isRice ? RICE_MILESTONES : FEED_MILESTONES
  const setup = 90000
  const revenue = isPlant ? 284000 : isRice ? 480000 : 412000
  return {
    overview: {
      title: project.title,
      totalProjectCost: target,
      fundingTarget: target,
      constructionDuration: isPlant ? 24 : 12,
      projectStartDate: isPlant ? "2023-01-01" : "2026-09-01",
      expectedCompletionDate: project.completion || (isPlant ? "2027-03-31" : isRice ? "2027-06-30" : "2027-09-30"),
      overallProgress: isPlant ? 60 : 0,
      statusLabel: statusLabel(project.status),
    },
    milestones: names.map((name, index) => ({
      ...blankMilestone(String(index + 1), name),
      progress: isPlant ? (index < 6 ? 100 : 0) : (index === 0 ? 5 : 0),
      status: isPlant ? (index < 6 ? "completed" : "planned") : "planned",
    })),
    investmentPlans: [
      {
        id: "standard",
        name: "Standard Plan",
        minInvestment: project.minInvestment || (isPlant ? 2000 : 100),
        maxInvestment: project.maxInvestment ?? null,
        roi: numberValue(project.expectedReturnPct, 18),
        durationYears: Math.max(1, Math.round(numberValue(project.investmentPeriodDays, 1825) / 365)),
        active: true,
      },
      {
        id: "strategic",
        name: "Strategic Plan",
        minInvestment: isPlant ? 25000 : 25000,
        maxInvestment: null,
        roi: numberValue(project.expectedReturnPct, 18) + 2,
        durationYears: 5,
        active: true,
      },
    ],
    finance: {
      landCost: Math.round(target * (isRice || isPlant ? 0.1 : 0.11)),
      constructionCost: Math.round(target * (isRice || isPlant ? 0.2 : 0.22)),
      machineryCost: Math.round(target * (isRice || isPlant ? 0.33 : 0.31)),
      installationCost: Math.round(target * 0.1),
      storageCost: Math.round(target * (isRice || isPlant ? 0.13 : 0.12)),
      setupCost: setup,
      workingCapital: Math.round(target * 0.06),
      operationalExpenses: Math.round(target * 0.05),
      revenue,
      profit: Math.round(revenue * 0.22),
      investorCapital: project.raised || 0,
      investorReturns: Math.round((project.raised || 0) * numberValue(project.expectedReturnPct, 18) / 100),
    },
    updates: [],
    pageContent: defaultPageContent(type),
  }
}

function dashboardFromProject(type: FacilityType, project: AdminInvestProject): FacilityDashboard {
  const base = defaultDashboard(type, project)
  const saved = asRecord(asRecord(project.meta).facility_dashboard)
  const overview = { ...base.overview, ...asRecord(saved.overview) }
  const finance = { ...base.finance, ...asRecord(saved.finance) }
  const milestones = Array.isArray(saved.milestones)
    ? saved.milestones.map((item: any, index: number) => ({
      ...blankMilestone(String(item.id || index + 1), item.name || `Milestone ${index + 1}`),
      ...item,
      id: String(item.id || index + 1),
      progress: Math.min(100, Math.max(0, numberValue(item.progress))),
    }))
    : base.milestones
  const investmentPlans = Array.isArray(saved.investmentPlans)
    ? saved.investmentPlans.map((item: any, index: number) => ({
      ...base.investmentPlans[0],
      ...item,
      id: String(item.id || `plan-${index + 1}`),
      minInvestment: numberValue(item.minInvestment),
      maxInvestment: item.maxInvestment == null || item.maxInvestment === "" ? null : numberValue(item.maxInvestment),
      roi: numberValue(item.roi),
      durationYears: numberValue(item.durationYears, 1),
      active: item.active !== false,
    }))
    : base.investmentPlans
  const updates = Array.isArray(saved.updates)
    ? saved.updates.map((item: any, index: number) => ({
      ...item,
      id: String(item.id || `update-${index + 1}`),
      progress: numberValue(item.progress),
      published: item.published !== false,
    }))
    : base.updates
  const pageContent = {
    ...base.pageContent,
    ...asRecord(saved.pageContent),
  } as FacilityCmsContent
  return { overview, milestones, investmentPlans, finance, updates, pageContent }
}

function Field({ label, value, onChange, type = "text", placeholder }: {
  label: string
  value: string | number
  onChange: (value: string) => void
  type?: "text" | "number" | "date"
  placeholder?: string
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs focus:border-primary focus:outline-none"
      />
    </label>
  )
}

function TextArea({ label, value, onChange, rows = 3 }: {
  label: string
  value: string
  onChange: (value: string) => void
  rows?: number
}) {
  return (
    <label className="block">
      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={e => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs focus:border-primary focus:outline-none"
      />
    </label>
  )
}

export function FacilityAdminControlCenter({
  type,
  projects,
  onToast,
  onUpdated,
  onEditProject,
}: {
  type: FacilityType
  projects: AdminInvestProject[]
  onToast: (msg: string, type?: "success" | "error") => void
  onUpdated: () => void
  onEditProject: (project: AdminInvestProject) => void
}) {
  const [selectedId, setSelectedId] = useState(projects[0]?.id || "")
  const project = projects.find(item => item.id === selectedId) || projects[0]
  const [dashboard, setDashboard] = useState<FacilityDashboard | null>(() => project ? dashboardFromProject(type, project) : null)
  const [tab, setTab] = useState<ControlTab>(type === "plant" ? "stats" : "overview")
  const [saving, setSaving] = useState(false)
  const [showAdvancedJson, setShowAdvancedJson] = useState(false)
  const [advancedJson, setAdvancedJson] = useState("{}")

  useEffect(() => {
    if (!projects.some(item => item.id === selectedId)) setSelectedId(projects[0]?.id || "")
  }, [projects, selectedId])

  useEffect(() => {
    if (project) {
      const next = dashboardFromProject(type, project)
      setDashboard(next)
      setAdvancedJson(JSON.stringify(next.pageContent, null, 2))
    }
  }, [project?.id, project?.meta, type])

  useEffect(() => {
    setTab(type === "plant" ? "stats" : "overview")
  }, [type])

  const totals = useMemo(() => {
    if (!dashboard || !project) return { costs: 0, remaining: 0, fundingPct: 0, progress: 0 }
    const costs = FINANCE_FIELDS.reduce((sum, field) => sum + numberValue(dashboard.finance[field.key]), 0)
    const milestoneProgress = dashboard.milestones.length
      ? Math.round(dashboard.milestones.reduce((sum, milestone) => sum + numberValue(milestone.progress), 0) / dashboard.milestones.length)
      : numberValue(dashboard.overview.overallProgress)
    return {
      costs,
      remaining: Math.max(0, numberValue(dashboard.overview.fundingTarget) - numberValue(project.raised)),
      fundingPct: dashboard.overview.fundingTarget > 0 ? Math.min(100, Math.round((numberValue(project.raised) / dashboard.overview.fundingTarget) * 100)) : 0,
      progress: numberValue(dashboard.overview.overallProgress) > 0 ? Math.min(100, numberValue(dashboard.overview.overallProgress)) : milestoneProgress,
    }
  }, [dashboard, project])

  if (!project || !dashboard) {
    return <div className="rounded-xl border border-dashed border-border bg-white p-10 text-center text-sm text-muted-foreground">Create a facility project to open its management dashboard.</div>
  }

  const updateDashboard = (patch: Partial<FacilityDashboard>) => setDashboard(current => current ? { ...current, ...patch } : current)
  const updatePageContent = (patch: Partial<FacilityCmsContent>) => {
    setDashboard(current => current ? { ...current, pageContent: { ...current.pageContent, ...patch } } : current)
  }

  const isPlant = type === "plant"
  const facilityName = isPlant ? "Processing Plant" : type === "ricemill" ? "Rice Mill" : "Feed Mill"

  async function saveDashboard() {
    setSaving(true)
    try {
      let pageContent = dashboard.pageContent
      if (showAdvancedJson) {
        try {
          pageContent = JSON.parse(advancedJson) as FacilityCmsContent
        } catch {
          onToast("Advanced JSON is invalid", "error")
          setSaving(false)
          return
        }
      }

      const next: FacilityDashboard = {
        ...dashboard,
        pageContent,
        overview: {
          ...dashboard.overview,
          overallProgress: totals.progress,
          statusLabel: statusLabel(project.status),
        },
      }
      setDashboard(next)

      await updateProjectAsync(project.id, {
        target: next.overview.fundingTarget,
        minInvestment: next.investmentPlans.find(plan => plan.active)?.minInvestment || project.minInvestment,
        maxInvestment: next.investmentPlans.find(plan => plan.active)?.maxInvestment ?? project.maxInvestment,
        roi: `${numberValue(next.investmentPlans.find(plan => plan.active)?.roi, numberValue(project.expectedReturnPct, 18))}%`,
        expectedReturnPct: numberValue(next.investmentPlans.find(plan => plan.active)?.roi, numberValue(project.expectedReturnPct, 18)),
        investmentPeriodDays: numberValue(next.investmentPlans.find(plan => plan.active)?.durationYears, 1) * 365,
        status: project.status,
        location: project.location,
        currentProjectStage: next.milestones.find(milestone => milestone.status !== "completed")?.name || "Full Operations",
        completion: next.overview.expectedCompletionDate,
        meta: { ...(project.meta || {}), facility_dashboard: next },
      })

      const cms = compactFacilityContent(dashboardToFacilityContent(type, next, {
        title: project.title,
        location: project.location,
        raised: numberValue(project.raised),
        minInvestment: numberValue(project.minInvestment),
        expectedReturnPct: numberValue(project.expectedReturnPct),
        roi: project.roi,
        status: project.status,
      }))
      await saveFacilityContent(type, cms)

      onUpdated()
      onToast(`${facilityName} management changes saved`)
    } catch (error) {
      onToast(error instanceof Error ? error.message : "Failed to save facility changes", "error")
    } finally {
      setSaving(false)
    }
  }

  const setOverview = (key: keyof FacilityDashboard["overview"], value: string) => {
    const numeric = ["totalProjectCost", "fundingTarget", "constructionDuration", "overallProgress"].includes(key)
    updateDashboard({ overview: { ...dashboard.overview, [key]: numeric ? numberValue(value) : value } })
  }

  const updateMilestone = (id: string, patch: Partial<FacilityMilestone>) => {
    updateDashboard({ milestones: dashboard.milestones.map(item => item.id === id ? { ...item, ...patch } : item) })
  }

  const updatePlan = (id: string, patch: Partial<InvestmentPlan>) => {
    updateDashboard({ investmentPlans: dashboard.investmentPlans.map(item => item.id === id ? { ...item, ...patch } : item) })
  }

  const updateFinance = (key: keyof FinanceData, value: string) => {
    updateDashboard({ finance: { ...dashboard.finance, [key]: numberValue(value) } })
  }

  const updateItem = (id: string, patch: Partial<FacilityUpdate>) => {
    updateDashboard({ updates: dashboard.updates.map(item => item.id === id ? { ...item, ...patch } : item) })
  }

  const plantTabs: Array<{ id: ControlTab; label: string; icon: LucideIcon }> = [
    { id: "stats", label: "Top Cards", icon: Gauge },
    { id: "utilization", label: "Utilization", icon: Activity },
    { id: "production", label: "Production Chart", icon: BarChart3 },
    { id: "stages", label: "Processing Stages", icon: Layers },
    { id: "timeline", label: "Timeline", icon: CalendarDays },
    { id: "updates", label: "Updates", icon: ClipboardList },
    { id: "content", label: "Page Content", icon: FileText },
    { id: "overview", label: "Project Funding", icon: Factory },
    { id: "investments", label: "Investment Plans", icon: Users },
  ]

  const buildTabs: Array<{ id: ControlTab; label: string; icon: LucideIcon }> = [
    { id: "overview", label: "Project Overview", icon: Factory },
    { id: "investments", label: "Investment Plans", icon: Users },
    { id: "progress", label: "Project Progress", icon: Activity },
    { id: "finance", label: "Financials", icon: DollarSign },
    { id: "updates", label: "Updates", icon: ClipboardList },
    { id: "stats", label: "Top Cards", icon: Gauge },
    { id: "production", label: "Production Chart", icon: BarChart3 },
    { id: "content", label: "Page Content", icon: FileText },
  ]

  const tabs = isPlant ? plantTabs : buildTabs
  const page = dashboard.pageContent

  return (
    <section className="space-y-4">
      <div className="rounded-2xl bg-[#09251c] p-5 text-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <Factory className="h-4 w-4" /> Facility control center
            </div>
            <h2 className="text-xl font-bold">{facilityName} Project Management</h2>
            <p className="mt-1 max-w-2xl text-xs text-emerald-100/70">
              Manage investor-facing dashboard content (cards, charts, tabs) plus project funding and updates. Saved changes sync to the matching /invest facility page.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {projects.length > 1 && (
              <select value={project.id} onChange={e => setSelectedId(e.target.value)} className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs text-white outline-none">
                {projects.map(item => <option key={item.id} value={item.id} className="text-foreground">{item.title}</option>)}
              </select>
            )}
            <Link
              href={`/admin/project-deposits?project=${encodeURIComponent(project.id)}`}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/20"
            >
              <History className="h-3.5 w-3.5" /> Deposit history
            </Link>
            <button onClick={() => onEditProject(project)} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-[#09251c]">
              <Settings2 className="h-3.5 w-3.5" /> Edit project
            </button>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {([
            ["Total Project Value", money(dashboard.overview.totalProjectCost), Factory],
            ["Funding Target", money(dashboard.overview.fundingTarget), TrendingUp],
            ["Amount Raised", money(project.raised), DollarSign],
            ["Remaining Funding", money(totals.remaining), BarChart3],
            ["Investors", String(project.investors), Users],
            ["Progress", `${totals.progress}%`, Activity],
            ["Expected ROI", project.roi, TrendingUp],
            ["Completion", dashboard.overview.expectedCompletionDate || "—", CalendarDays],
          ] as Array<[string, string, LucideIcon]>).map(([label, value, Icon]) => (
            <div key={String(label)} className="rounded-xl border border-white/10 bg-white/[0.07] p-2.5">
              <Icon className="mb-1 h-3.5 w-3.5 text-emerald-300" />
              <div className="text-sm font-bold">{value}</div>
              <div className="mt-0.5 text-[9px] uppercase tracking-wide text-emerald-100/60">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white">
        <div className="flex gap-1 overflow-x-auto border-b border-border p-2">
          {tabs.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors" style={{ background: tab === item.id ? EMERALD : "transparent", color: tab === item.id ? "white" : "#64748b" }}>
              <item.icon className="h-3.5 w-3.5" /> {item.label}
            </button>
          ))}
          <button onClick={() => void saveDashboard()} disabled={saving} className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-60" style={{ background: GOLD, color: "#1f2933" }}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save changes
          </button>
        </div>

        <div className="p-4">
          {tab === "overview" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Display title" value={dashboard.overview.title || ""} onChange={value => setOverview("title", value)} />
                <Field label="Total project cost" value={dashboard.overview.totalProjectCost} type="number" onChange={value => setOverview("totalProjectCost", value)} />
                <Field label="Total investment target" value={dashboard.overview.fundingTarget} type="number" onChange={value => setOverview("fundingTarget", value)} />
                <Field label="Construction duration (months)" value={dashboard.overview.constructionDuration} type="number" onChange={value => setOverview("constructionDuration", value)} />
                <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current project status</span><select value={project.status as string} onChange={async e => { const nextStatus = e.target.value as AdminInvestProject["status"]; updateDashboard({ overview: { ...dashboard.overview, statusLabel: statusLabel(nextStatus) } }); try { await updateProjectAsync(project.id, { status: nextStatus }); onUpdated(); onToast("Project status updated") } catch { onToast("Failed to update status", "error") } }} className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs focus:border-primary focus:outline-none">{STATUS_OPTIONS.map(option => <option key={option} value={option}>{STATUS_LABELS[option]}</option>)}</select></label>
                <Field label="Project start date" value={dashboard.overview.projectStartDate} type="date" onChange={value => setOverview("projectStartDate", value)} />
                <Field label="Expected completion date" value={dashboard.overview.expectedCompletionDate} type="date" onChange={value => setOverview("expectedCompletionDate", value)} />
                <Field label="Overall progress %" value={totals.progress} type="number" onChange={value => setOverview("overallProgress", value)} />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-[#D4A012]" /> Project overview</div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><div className="text-[10px] uppercase text-muted-foreground">Location</div><div className="mt-1 text-sm font-semibold">{project.location || "Not set"}</div></div>
                    <div><div className="text-[10px] uppercase text-muted-foreground">Minimum investment</div><div className="mt-1 text-sm font-semibold">{money(project.minInvestment || 0)}</div></div>
                    <div><div className="text-[10px] uppercase text-muted-foreground">Investment duration</div><div className="mt-1 text-sm font-semibold">{Math.round(numberValue(project.investmentPeriodDays, 0) / 365) || "—"} years</div></div>
                    <div><div className="text-[10px] uppercase text-muted-foreground">Current stage</div><div className="mt-1 text-sm font-semibold">{project.currentProjectStage || "Not set"}</div></div>
                  </div>
                </div>
                <div className="rounded-xl border border-border p-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold"><FileText className="h-4 w-4 text-[#D4A012]" /> Project documents</div>
                  <p className="text-xs text-muted-foreground">{project.documents?.length || 0} document{project.documents?.length === 1 ? "" : "s"} attached. Upload from the project editor.</p>
                  <button onClick={() => onEditProject(project)} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"><Upload className="h-3.5 w-3.5" /> Manage documents</button>
                </div>
              </div>
            </div>
          )}

          {tab === "investments" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold">Investment plans</h3><p className="text-xs text-muted-foreground">Plans investors can choose on this facility.</p></div><button onClick={() => updateDashboard({ investmentPlans: [...dashboard.investmentPlans, { id: `plan-${Date.now()}`, name: "New Plan", minInvestment: 100, maxInvestment: null, roi: 18, durationYears: 5, active: true }] })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: EMERALD }}><Plus className="h-3.5 w-3.5" /> Add plan</button></div>
              {dashboard.investmentPlans.map(plan => (
                <div key={plan.id} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1.4fr_1fr_1fr_1fr_1fr_auto] sm:items-end">
                  <Field label="Plan name" value={plan.name} onChange={value => updatePlan(plan.id, { name: value })} />
                  <Field label="Minimum" value={plan.minInvestment} type="number" onChange={value => updatePlan(plan.id, { minInvestment: numberValue(value) })} />
                  <Field label="Maximum" value={plan.maxInvestment ?? ""} type="number" onChange={value => updatePlan(plan.id, { maxInvestment: value === "" ? null : numberValue(value) })} placeholder="No limit" />
                  <Field label="ROI %" value={plan.roi} type="number" onChange={value => updatePlan(plan.id, { roi: numberValue(value) })} />
                  <Field label="Duration years" value={plan.durationYears} type="number" onChange={value => updatePlan(plan.id, { durationYears: numberValue(value, 1) })} />
                  <div className="flex items-center gap-1.5 pb-0.5"><button onClick={() => updatePlan(plan.id, { active: !plan.active })} className="rounded-lg px-2.5 py-2 text-[10px] font-bold" style={{ background: plan.active ? "#ecfdf5" : "#f1f5f9", color: plan.active ? "#047857" : "#64748b" }}>{plan.active ? "Active" : "Inactive"}</button>{dashboard.investmentPlans.length > 1 && <button onClick={() => updateDashboard({ investmentPlans: dashboard.investmentPlans.filter(item => item.id !== plan.id) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>}</div>
                </div>
              ))}
            </div>
          )}

          {tab === "progress" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-sm font-bold">{facilityName} construction milestones</h3><p className="text-xs text-muted-foreground">Published milestones sync to the investor timeline and stages tabs.</p></div><button onClick={() => updateDashboard({ milestones: [...dashboard.milestones, blankMilestone(`milestone-${Date.now()}`)] })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: EMERALD }}><Plus className="h-3.5 w-3.5" /> Add milestone</button></div>
              {dashboard.milestones.map((milestone, index) => (
                <div key={milestone.id} className="rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50 text-[10px] font-bold text-emerald-700">{index + 1}</span><input value={milestone.name} onChange={e => updateMilestone(milestone.id, { name: e.target.value })} className="min-w-[220px] flex-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold focus:outline-none focus:border-primary" /><select value={milestone.status} onChange={e => updateMilestone(milestone.id, { status: e.target.value as MilestoneStatus })} className="rounded-lg border border-border px-2.5 py-2 text-xs"><option value="planned">Planned</option><option value="in_progress">In Progress</option><option value="completed">Completed</option></select>{dashboard.milestones.length > 1 && <button onClick={() => updateDashboard({ milestones: dashboard.milestones.filter(item => item.id !== milestone.id) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>}</div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-4"><Field label="Progress %" value={milestone.progress} type="number" onChange={value => updateMilestone(milestone.id, { progress: Math.min(100, Math.max(0, numberValue(value))) })} /><Field label="Start date" value={milestone.startDate} type="date" onChange={value => updateMilestone(milestone.id, { startDate: value })} /><Field label="Expected completion" value={milestone.expectedDate} type="date" onChange={value => updateMilestone(milestone.id, { expectedDate: value })} /><Field label="Actual completion" value={milestone.actualDate} type="date" onChange={value => updateMilestone(milestone.id, { actualDate: value })} /></div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-4"><Field label="Capacity / output" value={milestone.capacity} onChange={value => updateMilestone(milestone.id, { capacity: value })} placeholder="e.g. 120 T/day" /><Field label="Photos" value={milestone.photos} onChange={value => updateMilestone(milestone.id, { photos: value })} /><Field label="Videos" value={milestone.videos} onChange={value => updateMilestone(milestone.id, { videos: value })} /><Field label="Documents" value={milestone.documents} onChange={value => updateMilestone(milestone.id, { documents: value })} /></div>
                  <textarea value={milestone.description} onChange={e => updateMilestone(milestone.id, { description: e.target.value })} rows={2} placeholder="Describe the work…" className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none" />
                </div>
              ))}
            </div>
          )}

          {tab === "finance" && (
            <div className="space-y-4">
              <div><h3 className="text-sm font-bold">Financial management</h3><p className="text-xs text-muted-foreground">Costs and revenue feed the production chart and allocation breakdown when page overrides are empty.</p></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{FINANCE_FIELDS.map(field => <Field key={field.key} label={field.label} value={dashboard.finance[field.key]} type="number" onChange={value => updateFinance(field.key, value)} />)}</div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {([
                  ["revenue", "Revenue"], ["profit", "Profit"], ["investorCapital", "Investor Capital"], ["investorReturns", "Investor Returns"],
                ] as Array<[keyof FinanceData, string]>).map(([key, label]) => <Field key={key} label={label} value={dashboard.finance[key]} type="number" onChange={value => updateFinance(key, value)} />)}
              </div>
              <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-emerald-50 p-4"><div className="text-[10px] uppercase text-emerald-700">Tracked costs</div><div className="mt-1 text-lg font-bold text-emerald-900">{money(totals.costs)}</div></div><div className="rounded-xl bg-blue-50 p-4"><div className="text-[10px] uppercase text-blue-700">Revenue</div><div className="mt-1 text-lg font-bold text-blue-900">{money(dashboard.finance.revenue)}</div></div><div className="rounded-xl bg-amber-50 p-4"><div className="text-[10px] uppercase text-amber-700">Profit</div><div className="mt-1 text-lg font-bold text-amber-900">{money(dashboard.finance.profit)}</div></div></div>
            </div>
          )}

          {tab === "stats" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-sm font-bold">Top stat cards</h3><p className="text-xs text-muted-foreground">Four cards shown at the top of the investor facility page.</p></div>
                <button onClick={() => updatePageContent({ stats: [...(page.stats || []), { label: "New metric", value: "—", change: "", color: "text-emerald-500" }] })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: EMERALD }}><Plus className="h-3.5 w-3.5" /> Add card</button>
              </div>
              {!(page.stats?.length) && !isPlant && (
                <div className="rounded-lg border border-dashed border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  No custom cards yet. On save, funding target / raised / progress / completion cards are generated automatically from this project. Add cards here to override.
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Layout title" value={page.layoutTitle || ""} onChange={v => updatePageContent({ layoutTitle: v })} />
                <Field label="Layout subtitle" value={page.layoutSubtitle || ""} onChange={v => updatePageContent({ layoutSubtitle: v })} />
                <Field label="Project status badge" value={page.projectStatus || ""} onChange={v => updatePageContent({ projectStatus: v })} />
                <Field label="Utilization badge" value={page.utilizationBadge || ""} onChange={v => updatePageContent({ utilizationBadge: v })} />
              </div>
              {(page.stats || []).map((stat, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1.2fr_1fr_1.2fr_1fr_auto] sm:items-end">
                  <Field label="Label" value={stat.label} onChange={v => updatePageContent({ stats: (page.stats || []).map((s, i) => i === index ? { ...s, label: v } : s) })} />
                  <Field label="Value" value={stat.value} onChange={v => updatePageContent({ stats: (page.stats || []).map((s, i) => i === index ? { ...s, value: v } : s) })} />
                  <Field label="Change / subtext" value={stat.change} onChange={v => updatePageContent({ stats: (page.stats || []).map((s, i) => i === index ? { ...s, change: v } : s) })} />
                  <Field label="Color class" value={stat.color} onChange={v => updatePageContent({ stats: (page.stats || []).map((s, i) => i === index ? { ...s, color: v } : s) })} />
                  <button onClick={() => updatePageContent({ stats: (page.stats || []).filter((_, i) => i !== index) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {tab === "utilization" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-sm font-bold">Utilization bars</h3><p className="text-xs text-muted-foreground">Progress rows shown next to project overview.</p></div>
                <button onClick={() => updatePageContent({ utilizationRows: [...(page.utilizationRows || []), { label: "New line", value: "0 / 100", pct: 0 }] })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: EMERALD }}><Plus className="h-3.5 w-3.5" /> Add row</button>
              </div>
              <Field label="Section title" value={page.utilizationTitle || ""} onChange={v => updatePageContent({ utilizationTitle: v })} />
              {(page.utilizationRows || []).map((row, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1.4fr_1.4fr_0.8fr_auto] sm:items-end">
                  <Field label="Label" value={row.label} onChange={v => updatePageContent({ utilizationRows: (page.utilizationRows || []).map((r, i) => i === index ? { ...r, label: v } : r) })} />
                  <Field label="Display value" value={row.value} onChange={v => updatePageContent({ utilizationRows: (page.utilizationRows || []).map((r, i) => i === index ? { ...r, value: v } : r) })} />
                  <Field label="Percent" value={row.pct} type="number" onChange={v => updatePageContent({ utilizationRows: (page.utilizationRows || []).map((r, i) => i === index ? { ...r, pct: Math.min(100, Math.max(0, numberValue(v))) } : r) })} />
                  <button onClick={() => updatePageContent({ utilizationRows: (page.utilizationRows || []).filter((_, i) => i !== index) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {tab === "production" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-sm font-bold">Monthly production chart</h3><p className="text-xs text-muted-foreground">Data points for revenue and profit on the Production tab.</p></div>
                <button onClick={() => updatePageContent({ productionData: [...(page.productionData || []), { month: "New", output: 0, revenue: 0, profit: 0 }] })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: EMERALD }}><Plus className="h-3.5 w-3.5" /> Add month</button>
              </div>
              {(page.productionData || []).map((point, index) => (
                <div key={index} className="grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-end">
                  <Field label="Month" value={point.month} onChange={v => updatePageContent({ productionData: (page.productionData || []).map((p, i) => i === index ? { ...p, month: v } : p) })} />
                  <Field label="Output" value={point.output} type="number" onChange={v => updatePageContent({ productionData: (page.productionData || []).map((p, i) => i === index ? { ...p, output: numberValue(v) } : p) })} />
                  <Field label="Revenue" value={point.revenue} type="number" onChange={v => updatePageContent({ productionData: (page.productionData || []).map((p, i) => i === index ? { ...p, revenue: numberValue(v) } : p) })} />
                  <Field label="Profit" value={point.profit} type="number" onChange={v => updatePageContent({ productionData: (page.productionData || []).map((p, i) => i === index ? { ...p, profit: numberValue(v) } : p) })} />
                  <button onClick={() => updatePageContent({ productionData: (page.productionData || []).filter((_, i) => i !== index) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                </div>
              ))}
            </div>
          )}

          {tab === "stages" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-sm font-bold">Processing stages</h3><p className="text-xs text-muted-foreground">Cards on the Processing Stages investor tab.</p></div>
                <button onClick={() => updatePageContent({ processingStages: [...(page.processingStages || []), { id: (page.processingStages?.length || 0) + 1, label: "New stage", desc: "", capacity: "—", status: "planned" }] })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: EMERALD }}><Plus className="h-3.5 w-3.5" /> Add stage</button>
              </div>
              {(page.processingStages || []).map((stage, index) => (
                <div key={index} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[0.5fr_1.5fr_1fr_1fr_auto] sm:items-end">
                    <Field label="ID" value={stage.id} type="number" onChange={v => updatePageContent({ processingStages: (page.processingStages || []).map((s, i) => i === index ? { ...s, id: numberValue(v, index + 1) } : s) })} />
                    <Field label="Label" value={stage.label} onChange={v => updatePageContent({ processingStages: (page.processingStages || []).map((s, i) => i === index ? { ...s, label: v } : s) })} />
                    <Field label="Capacity" value={stage.capacity} onChange={v => updatePageContent({ processingStages: (page.processingStages || []).map((s, i) => i === index ? { ...s, capacity: v } : s) })} />
                    <label className="block"><span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Status</span><select value={stage.status} onChange={e => updatePageContent({ processingStages: (page.processingStages || []).map((s, i) => i === index ? { ...s, status: e.target.value as typeof stage.status } : s) })} className="mt-1 w-full rounded-lg border border-border bg-white px-3 py-2 text-xs">{STAGE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
                    <button onClick={() => updatePageContent({ processingStages: (page.processingStages || []).filter((_, i) => i !== index) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <TextArea label="Description" value={stage.desc} onChange={v => updatePageContent({ processingStages: (page.processingStages || []).map((s, i) => i === index ? { ...s, desc: v } : s) })} rows={2} />
                </div>
              ))}
            </div>
          )}

          {tab === "timeline" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-sm font-bold">Project timeline</h3><p className="text-xs text-muted-foreground">Milestones on the Project Timeline investor tab.</p></div>
                <button onClick={() => updatePageContent({ timeline: [...(page.timeline || []), { year: "2026", q: "Q1", label: "New milestone", desc: "", done: false }] })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: EMERALD }}><Plus className="h-3.5 w-3.5" /> Add milestone</button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Timeline title" value={page.timelineTitle || ""} onChange={v => updatePageContent({ timelineTitle: v })} />
                <Field label="Timeline subtitle" value={page.timelineSubtitle || ""} onChange={v => updatePageContent({ timelineSubtitle: v })} />
              </div>
              {(page.timeline || []).map((item, index) => (
                <div key={index} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[0.7fr_0.5fr_1.5fr_auto_auto] sm:items-end">
                    <Field label="Year" value={item.year} onChange={v => updatePageContent({ timeline: (page.timeline || []).map((t, i) => i === index ? { ...t, year: v } : t) })} />
                    <Field label="Quarter" value={item.q} onChange={v => updatePageContent({ timeline: (page.timeline || []).map((t, i) => i === index ? { ...t, q: v } : t) })} />
                    <Field label="Label" value={item.label} onChange={v => updatePageContent({ timeline: (page.timeline || []).map((t, i) => i === index ? { ...t, label: v } : t) })} />
                    <button onClick={() => updatePageContent({ timeline: (page.timeline || []).map((t, i) => i === index ? { ...t, done: !t.done } : t) })} className="rounded-lg px-2.5 py-2 text-[10px] font-bold" style={{ background: item.done ? "#ecfdf5" : "#f1f5f9", color: item.done ? "#047857" : "#64748b" }}>{item.done ? "Done" : "Pending"}</button>
                    <button onClick={() => updatePageContent({ timeline: (page.timeline || []).filter((_, i) => i !== index) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <TextArea label="Description" value={item.desc} onChange={v => updatePageContent({ timeline: (page.timeline || []).map((t, i) => i === index ? { ...t, desc: v } : t) })} rows={2} />
                </div>
              ))}
            </div>
          )}

          {tab === "updates" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div><h3 className="text-sm font-bold">{isPlant ? "Operational updates" : "Project updates"}</h3><p className="text-xs text-muted-foreground">Published updates appear on the Production tab feed.</p></div>
                <div className="flex gap-2">
                  {isPlant && (
                    <button onClick={() => updatePageContent({ operationalUpdates: [{ date: new Date().toISOString().slice(0, 10), title: "New update", desc: "" }, ...(page.operationalUpdates || [])] })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: EMERALD }}><Plus className="h-3.5 w-3.5" /> Add page update</button>
                  )}
                  {!isPlant && (
                    <button onClick={() => updateDashboard({ updates: [{ id: `update-${Date.now()}`, title: "New project update", description: "", progress: totals.progress, date: new Date().toISOString().slice(0, 10), photos: "", videos: "", documents: "", published: false }, ...dashboard.updates] })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white" style={{ background: EMERALD }}><Plus className="h-3.5 w-3.5" /> Add update</button>
                  )}
                </div>
              </div>

              {isPlant && (page.operationalUpdates || []).map((update, index) => (
                <div key={index} className="rounded-xl border border-border p-3 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-[1.2fr_1fr_auto] sm:items-end">
                    <Field label="Title" value={update.title} onChange={v => updatePageContent({ operationalUpdates: (page.operationalUpdates || []).map((u, i) => i === index ? { ...u, title: v } : u) })} />
                    <Field label="Date" value={update.date} onChange={v => updatePageContent({ operationalUpdates: (page.operationalUpdates || []).map((u, i) => i === index ? { ...u, date: v } : u) })} />
                    <button onClick={() => updatePageContent({ operationalUpdates: (page.operationalUpdates || []).filter((_, i) => i !== index) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                  </div>
                  <TextArea label="Description" value={update.desc} onChange={v => updatePageContent({ operationalUpdates: (page.operationalUpdates || []).map((u, i) => i === index ? { ...u, desc: v } : u) })} rows={2} />
                </div>
              ))}

              {!isPlant && dashboard.updates.length === 0 && <div className="rounded-xl border border-dashed border-border py-10 text-center text-xs text-muted-foreground">No updates yet.</div>}
              {!isPlant && dashboard.updates.map(update => (
                <div key={update.id} className="rounded-xl border border-border p-3">
                  <div className="grid gap-2 sm:grid-cols-[1.5fr_1fr_1fr_auto] sm:items-end"><Field label="Update title" value={update.title} onChange={value => updateItem(update.id, { title: value })} /><Field label="Update date" value={update.date} type="date" onChange={value => updateItem(update.id, { date: value })} /><Field label="Progress %" value={update.progress} type="number" onChange={value => updateItem(update.id, { progress: numberValue(value) })} /><div className="flex items-center gap-1.5 pb-0.5"><button onClick={() => updateItem(update.id, { published: !update.published })} className="rounded-lg px-2.5 py-2 text-[10px] font-bold" style={{ background: update.published ? "#ecfdf5" : "#f1f5f9", color: update.published ? "#047857" : "#64748b" }}>{update.published ? "Published" : "Draft"}</button><button onClick={() => updateDashboard({ updates: dashboard.updates.filter(item => item.id !== update.id) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button></div></div>
                  <textarea value={update.description} onChange={e => updateItem(update.id, { description: e.target.value })} rows={2} placeholder="Write the update shown to investors…" className="mt-2 w-full rounded-lg border border-border px-3 py-2 text-xs focus:border-primary focus:outline-none" />
                  <div className="mt-2 grid gap-2 sm:grid-cols-3"><Field label="Images" value={update.photos} onChange={value => updateItem(update.id, { photos: value })} /><Field label="Videos" value={update.videos} onChange={value => updateItem(update.id, { videos: value })} /><Field label="Documents" value={update.documents} onChange={value => updateItem(update.id, { documents: value })} /></div>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground"><span className="inline-flex items-center gap-1"><ImagePlus className="h-3 w-3" /> Images</span><span className="inline-flex items-center gap-1"><Video className="h-3 w-3" /> Videos</span><span className="inline-flex items-center gap-1"><FileText className="h-3 w-3" /> Documents</span></div>
                </div>
              ))}
            </div>
          )}

          {tab === "content" && (
            <div className="space-y-4">
              <div><h3 className="text-sm font-bold">Investor page content</h3><p className="text-xs text-muted-foreground">Hero, overview sidebar, allocation, FAQs and footer CTA.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Hero eyebrow" value={page.hero?.eyebrow || ""} onChange={v => updatePageContent({ hero: { ...page.hero, eyebrow: v } })} />
                <Field label="Hero title" value={page.hero?.title || ""} onChange={v => updatePageContent({ hero: { ...page.hero, title: v } })} />
              </div>
              <TextArea label="Hero description" value={page.hero?.description || ""} onChange={v => updatePageContent({ hero: { ...page.hero, description: v } })} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Invest CTA" value={page.hero?.investCta || ""} onChange={v => updatePageContent({ hero: { ...page.hero, investCta: v } })} />
                <Field label="Download CTA" value={page.hero?.downloadCta || ""} onChange={v => updatePageContent({ hero: { ...page.hero, downloadCta: v } })} />
                <Field label="Meeting CTA" value={page.hero?.meetingCta || ""} onChange={v => updatePageContent({ hero: { ...page.hero, meetingCta: v } })} />
              </div>
              <Field label="Overview title" value={page.overviewTitle || ""} onChange={v => updatePageContent({ overviewTitle: v })} />
              <div className="space-y-2">
                <div className="flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Overview details</h4><button onClick={() => updatePageContent({ overviewDetails: [...(page.overviewDetails || []), { label: "New field", value: "" }] })} className="text-xs font-semibold text-emerald-700">+ Add</button></div>
                {(page.overviewDetails || []).map((detail, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <Field label="Label" value={detail.label} onChange={v => updatePageContent({ overviewDetails: (page.overviewDetails || []).map((d, i) => i === index ? { ...d, label: v } : d) })} />
                    <Field label="Value" value={detail.value} onChange={v => updatePageContent({ overviewDetails: (page.overviewDetails || []).map((d, i) => i === index ? { ...d, value: v } : d) })} />
                    <button onClick={() => updatePageContent({ overviewDetails: (page.overviewDetails || []).filter((_, i) => i !== index) })} className="mt-5 rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
              <Field label="Allocation title" value={page.allocationTitle || ""} onChange={v => updatePageContent({ allocationTitle: v })} />
              <div className="space-y-2">
                <div className="flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Allocation rows</h4><button onClick={() => updatePageContent({ allocation: [...(page.allocation || []), { label: "Item", pct: 0, value: "$0" }] })} className="text-xs font-semibold text-emerald-700">+ Add</button></div>
                {(page.allocation || []).map((item, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1.4fr_0.7fr_1fr_auto] sm:items-end">
                    <Field label="Label" value={item.label} onChange={v => updatePageContent({ allocation: (page.allocation || []).map((a, i) => i === index ? { ...a, label: v } : a) })} />
                    <Field label="%" value={item.pct} type="number" onChange={v => updatePageContent({ allocation: (page.allocation || []).map((a, i) => i === index ? { ...a, pct: numberValue(v) } : a) })} />
                    <Field label="Value" value={item.value} onChange={v => updatePageContent({ allocation: (page.allocation || []).map((a, i) => i === index ? { ...a, value: v } : a) })} />
                    <button onClick={() => updatePageContent({ allocation: (page.allocation || []).filter((_, i) => i !== index) })} className="rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Why this project</h4><button onClick={() => updatePageContent({ whyThisProject: [...(page.whyThisProject || []), { title: "Benefit", desc: "" }] })} className="text-xs font-semibold text-emerald-700">+ Add</button></div>
                {(page.whyThisProject || []).map((item, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <Field label="Title" value={item.title} onChange={v => updatePageContent({ whyThisProject: (page.whyThisProject || []).map((w, i) => i === index ? { ...w, title: v } : w) })} />
                    <Field label="Description" value={item.desc} onChange={v => updatePageContent({ whyThisProject: (page.whyThisProject || []).map((w, i) => i === index ? { ...w, desc: v } : w) })} />
                    <button onClick={() => updatePageContent({ whyThisProject: (page.whyThisProject || []).filter((_, i) => i !== index) })} className="mt-5 rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">FAQs</h4><button onClick={() => updatePageContent({ faqs: [...(page.faqs || []), { question: "New question?", answer: "" }] })} className="text-xs font-semibold text-emerald-700">+ Add</button></div>
                {(page.faqs || []).map((faq, index) => (
                  <div key={index} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex gap-2">
                      <div className="flex-1"><Field label="Question" value={faq.question} onChange={v => updatePageContent({ faqs: (page.faqs || []).map((f, i) => i === index ? { ...f, question: v } : f) })} /></div>
                      <button onClick={() => updatePageContent({ faqs: (page.faqs || []).filter((_, i) => i !== index) })} className="mt-5 rounded-lg p-2 text-red-500 hover:bg-red-50"><X className="h-3.5 w-3.5" /></button>
                    </div>
                    <TextArea label="Answer" value={faq.answer} onChange={v => updatePageContent({ faqs: (page.faqs || []).map((f, i) => i === index ? { ...f, answer: v } : f) })} />
                  </div>
                ))}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Footer title" value={page.footerCta?.title || ""} onChange={v => updatePageContent({ footerCta: { ...page.footerCta, title: v } })} />
                <Field label="Footer description" value={page.footerCta?.description || ""} onChange={v => updatePageContent({ footerCta: { ...page.footerCta, description: v } })} />
                <Field label="Footer invest label" value={page.footerCta?.investLabel || ""} onChange={v => updatePageContent({ footerCta: { ...page.footerCta, investLabel: v } })} />
                <Field label="Footer contact label" value={page.footerCta?.contactLabel || ""} onChange={v => updatePageContent({ footerCta: { ...page.footerCta, contactLabel: v } })} />
              </div>

              <div className="rounded-xl border border-dashed border-border p-3">
                <button type="button" onClick={() => { setShowAdvancedJson(v => !v); setAdvancedJson(JSON.stringify(page, null, 2)) }} className="text-xs font-semibold text-emerald-700">
                  {showAdvancedJson ? "Hide advanced JSON" : "Show advanced JSON override"}
                </button>
                {showAdvancedJson && (
                  <textarea
                    value={advancedJson}
                    onChange={e => setAdvancedJson(e.target.value)}
                    rows={14}
                    className="mt-3 w-full rounded-lg border border-border bg-muted/20 p-3 font-mono text-xs"
                    spellCheck={false}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
