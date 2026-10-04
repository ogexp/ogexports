import {
  DEFAULT_STAT_COLORS,
  type FacilityAllocationItem,
  type FacilityBenefit,
  type FacilityCmsContent,
  type FacilityFaq,
  type FacilityFooterCta,
  type FacilityHero,
  type FacilityInvestorProtection,
  type FacilityOperationalUpdate,
  type FacilityOverviewDetail,
  type FacilityProductionPoint,
  type FacilityStage,
  type FacilityTimelineItem,
  type FacilityUtilizationRow,
  type InvestFacilityConfig,
} from "@/data/invest-facility-config"

const STAT_COLORS = [...DEFAULT_STAT_COLORS]

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {}
}

function asArray(value: unknown): any[] {
  return Array.isArray(value) ? value : []
}

function str(value: unknown, fallback = ""): string {
  if (value == null) return fallback
  return String(value)
}

function num(value: unknown, fallback = 0): number {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function formatMoneyLabel(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${Math.round(value).toLocaleString()}`
}

function quarterFromDate(dateStr: string): { year: string; q: string } {
  if (!dateStr || dateStr.length < 7) return { year: "—", q: "" }
  const year = dateStr.slice(0, 4)
  const month = Number(dateStr.slice(5, 7))
  if (!Number.isFinite(month) || month < 1) return { year, q: "" }
  const q = `Q${Math.ceil(month / 3)}`
  return { year, q }
}

function normalizeStat(raw: any, index: number) {
  return {
    label: str(raw?.label, `Metric ${index + 1}`),
    value: str(raw?.value, "—"),
    change: str(raw?.change ?? raw?.sub, ""),
    color: str(raw?.color, STAT_COLORS[index % STAT_COLORS.length]),
  }
}

function normalizeUtilizationRow(raw: any): FacilityUtilizationRow {
  if (raw?.current != null || raw?.capacity != null) {
    const current = num(raw.current)
    const capacity = num(raw.capacity)
    const unit = str(raw.unit, "")
    const pct = capacity > 0
      ? Math.min(100, Math.round((current / capacity) * 100))
      : Math.min(100, Math.round(num(raw.pct)))
    const value = str(
      raw.value,
      unit ? `${current} / ${capacity} ${unit}` : `${current} / ${capacity}`,
    )
    return { label: str(raw.label, "Utilization"), value, pct }
  }
  return {
    label: str(raw?.label, "Utilization"),
    value: str(raw?.value, "—"),
    pct: Math.min(100, Math.max(0, Math.round(num(raw?.pct)))),
  }
}

function normalizeTimelineItem(raw: any): FacilityTimelineItem {
  if (raw?.year != null || raw?.label != null) {
    return {
      year: str(raw.year, "—"),
      q: str(raw.q ?? raw.quarter, ""),
      label: str(raw.label ?? raw.title, "Milestone"),
      desc: str(raw.desc ?? raw.detail ?? raw.description, ""),
      done: Boolean(raw.done ?? raw.status === "completed"),
    }
  }
  const date = str(raw?.date ?? raw?.targetDate ?? raw?.expectedDate, "")
  const { year, q } = quarterFromDate(date)
  return {
    year,
    q,
    label: str(raw?.title ?? raw?.name, "Milestone"),
    desc: str(raw?.detail ?? raw?.description ?? raw?.notes, ""),
    done: Boolean(raw?.done ?? raw?.status === "completed"),
  }
}

function normalizeUpdate(raw: any): FacilityOperationalUpdate {
  return {
    date: str(raw?.date, ""),
    title: str(raw?.title, "Update"),
    desc: str(raw?.desc ?? raw?.body ?? raw?.description, ""),
  }
}

function normalizeStage(raw: any, index: number): FacilityStage {
  const statusRaw = str(raw?.status, "planned")
  const statusMap: Record<string, FacilityStage["status"]> = {
    operational: "operational",
    partial: "partial",
    planned: "planned",
    funding: "funding",
    completed: "completed",
    in_progress: "partial",
    active: "operational",
  }
  return {
    id: num(raw?.id, index + 1),
    label: str(raw?.label ?? raw?.name, `Stage ${index + 1}`),
    desc: str(raw?.desc ?? raw?.description, ""),
    capacity: str(raw?.capacity, "—"),
    status: statusMap[statusRaw] || "planned",
    icon: raw?.icon ? str(raw.icon) : undefined,
  }
}

function normalizeProductionPoint(raw: any): FacilityProductionPoint {
  return {
    month: str(raw?.month, "—"),
    output: num(raw?.output),
    revenue: num(raw?.revenue),
    profit: num(raw?.profit),
  }
}

function normalizeHero(raw: any, fallback?: FacilityHero): FacilityHero {
  const base = fallback || {
    eyebrow: "",
    title: "",
    description: "",
    investCta: "Invest now",
    downloadCta: "Download memorandum",
    meetingCta: "Schedule meeting",
  }
  const r = asRecord(raw)
  return {
    eyebrow: str(r.eyebrow, base.eyebrow),
    title: str(r.title, base.title),
    description: str(r.description, base.description),
    investCta: str(r.investCta, base.investCta),
    downloadCta: str(r.downloadCta, base.downloadCta),
    meetingCta: str(r.meetingCta, base.meetingCta),
  }
}

function normalizeFooter(raw: any, fallback?: FacilityFooterCta): FacilityFooterCta {
  const base = fallback || {
    title: "",
    description: "",
    investLabel: "Invest now",
    contactLabel: "Contact team",
  }
  const r = asRecord(raw)
  return {
    title: str(r.title, base.title),
    description: str(r.description, base.description),
    investLabel: str(r.investLabel, base.investLabel),
    contactLabel: str(r.contactLabel, base.contactLabel),
  }
}

/** Normalize legacy / mismatched CMS payloads into the investor page schema. */
export function normalizeFacilityContent(raw: unknown): FacilityCmsContent {
  const data = asRecord(raw)
  const stats = asArray(data.stats).map(normalizeStat)
  const utilizationRows = asArray(data.utilizationRows).map(normalizeUtilizationRow)
  const timeline = asArray(data.timeline).map(normalizeTimelineItem)
  const operationalUpdates = asArray(data.operationalUpdates).map(normalizeUpdate)
  const processingStages = asArray(data.processingStages).map(normalizeStage)
  const productionData = asArray(data.productionData).map(normalizeProductionPoint)
  const overviewDetails = asArray(data.overviewDetails).map((item: any) => ({
    label: str(item?.label, ""),
    value: str(item?.value, ""),
  })).filter((item: FacilityOverviewDetail) => item.label)
  const allocation = asArray(data.allocation).map((item: any) => ({
    label: str(item?.label, ""),
    pct: num(item?.pct),
    value: str(item?.value, ""),
  })).filter((item: FacilityAllocationItem) => item.label)
  const whyThisProject = asArray(data.whyThisProject).map((item: any) => ({
    title: str(item?.title, ""),
    desc: str(item?.desc ?? item?.description, ""),
  })).filter((item: FacilityBenefit) => item.title)
  const faqs = asArray(data.faqs).map((item: any) => ({
    question: str(item?.question, ""),
    answer: str(item?.answer, ""),
  })).filter((item: FacilityFaq) => item.question)
  const investorProtections = asArray(data.investorProtections).map((item: any) => ({
    value: str(item?.value, ""),
    label: str(item?.label, ""),
  })).filter((item: FacilityInvestorProtection) => item.value || item.label)

  const result: FacilityCmsContent = {}
  if (data.layoutTitle) result.layoutTitle = str(data.layoutTitle)
  if (data.layoutSubtitle) result.layoutSubtitle = str(data.layoutSubtitle)
  if (data.projectStatus) result.projectStatus = str(data.projectStatus)
  if (data.projectCode) result.projectCode = str(data.projectCode)
  if (data.utilizationBadge) result.utilizationBadge = str(data.utilizationBadge)
  if (data.utilizationTitle) result.utilizationTitle = str(data.utilizationTitle)
  if (data.overviewTitle) result.overviewTitle = str(data.overviewTitle)
  if (data.timelineTitle) result.timelineTitle = str(data.timelineTitle)
  if (data.timelineSubtitle) result.timelineSubtitle = str(data.timelineSubtitle)
  if (data.allocationTitle) result.allocationTitle = str(data.allocationTitle)
  if (data.downloadFilename) result.downloadFilename = str(data.downloadFilename)
  if (data.downloadContents) result.downloadContents = str(data.downloadContents)
  if (data.hero && typeof data.hero === "object") result.hero = normalizeHero(data.hero)
  if (data.footerCta && typeof data.footerCta === "object") result.footerCta = normalizeFooter(data.footerCta)
  if (stats.length) result.stats = stats
  if (utilizationRows.length) result.utilizationRows = utilizationRows
  if (timeline.length) result.timeline = timeline
  if (operationalUpdates.length) result.operationalUpdates = operationalUpdates
  if (processingStages.length) result.processingStages = processingStages
  if (productionData.length) result.productionData = productionData
  if (overviewDetails.length) result.overviewDetails = overviewDetails
  if (allocation.length) result.allocation = allocation
  if (whyThisProject.length) result.whyThisProject = whyThisProject
  if (faqs.length) result.faqs = faqs
  if (investorProtections.length) result.investorProtections = investorProtections
  return result
}

/** Merge remote CMS content over static facility config. */
export function mergeFacilityConfig(
  config: InvestFacilityConfig,
  remote: FacilityCmsContent,
): InvestFacilityConfig {
  const normalized = normalizeFacilityContent(remote)
  return {
    ...config,
    layoutTitle: normalized.layoutTitle || config.layoutTitle,
    layoutSubtitle: normalized.layoutSubtitle || config.layoutSubtitle,
    projectCode: normalized.projectCode || config.projectCode,
    projectStatus: normalized.projectStatus || config.projectStatus,
    hero: normalized.hero
      ? normalizeHero(normalized.hero, config.hero)
      : config.hero,
    stats: normalized.stats?.length ? normalized.stats : config.stats,
    utilizationBadge: normalized.utilizationBadge || config.utilizationBadge,
    utilizationTitle: normalized.utilizationTitle || config.utilizationTitle,
    utilizationRows: normalized.utilizationRows?.length
      ? normalized.utilizationRows
      : config.utilizationRows,
    overviewTitle: normalized.overviewTitle || config.overviewTitle,
    overviewDetails: normalized.overviewDetails?.length
      ? normalized.overviewDetails
      : config.overviewDetails,
    processingStages: normalized.processingStages?.length
      ? normalized.processingStages
      : config.processingStages,
    timelineTitle: normalized.timelineTitle || config.timelineTitle,
    timelineSubtitle: normalized.timelineSubtitle || config.timelineSubtitle,
    timeline: normalized.timeline?.length ? normalized.timeline : config.timeline,
    productionData: normalized.productionData?.length
      ? normalized.productionData
      : config.productionData,
    operationalUpdates: normalized.operationalUpdates?.length
      ? normalized.operationalUpdates
      : config.operationalUpdates,
    allocation: normalized.allocation?.length ? normalized.allocation : config.allocation,
    allocationTitle: normalized.allocationTitle || config.allocationTitle,
    whyThisProject: normalized.whyThisProject?.length
      ? normalized.whyThisProject
      : config.whyThisProject,
    faqs: normalized.faqs?.length ? normalized.faqs : config.faqs,
    footerCta: normalized.footerCta
      ? normalizeFooter(normalized.footerCta, config.footerCta)
      : config.footerCta,
    investorProtections: normalized.investorProtections?.length
      ? normalized.investorProtections
      : config.investorProtections,
    downloadFilename: normalized.downloadFilename || config.downloadFilename,
    downloadContents: normalized.downloadContents || config.downloadContents,
  }
}

export type SyncDashboardInput = {
  overview: {
    title?: string
    totalProjectCost?: number
    fundingTarget: number
    constructionDuration?: number
    projectStartDate?: string
    expectedCompletionDate?: string
    overallProgress: number
    statusLabel: string
  }
  milestones: Array<{
    id: string
    name: string
    progress: number
    startDate?: string
    expectedDate?: string
    actualDate?: string
    status: string
    description?: string
    capacity?: string
  }>
  investmentPlans: Array<{
    id: string
    name: string
    minInvestment: number
    maxInvestment: number | null
    roi: number
    durationYears: number
    active: boolean
  }>
  finance: {
    revenue: number
    profit: number
    landCost?: number
    constructionCost?: number
    machineryCost?: number
    installationCost?: number
    storageCost?: number
    setupCost?: number
    workingCapital?: number
    operationalExpenses?: number
  }
  updates: Array<{
    id: string
    title: string
    description: string
    progress?: number
    date: string
    published?: boolean
  }>
  /** Explicit investor-page overrides (plant + optional rice/feed edits). */
  pageContent?: FacilityCmsContent
}

export type SyncProjectInput = {
  title: string
  location?: string | null
  raised: number
  minInvestment: number
  expectedReturnPct?: number
  roi?: string
  status?: string
}

function deriveProductionFromFinance(finance: SyncDashboardInput["finance"]): FacilityProductionPoint[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"]
  const annualRevenue = num(finance.revenue)
  const annualProfit = num(finance.profit)
  return months.map((month, index) => {
    const factor = 0.7 + (index / (months.length - 1)) * 0.3
    return {
      month,
      output: Math.round(40 + index * 6),
      revenue: Math.round((annualRevenue / 12) * factor * 1.4),
      profit: Math.round((annualProfit / 12) * factor * 1.4),
    }
  })
}

function deriveAllocationFromFinance(finance: SyncDashboardInput["finance"], target: number): FacilityAllocationItem[] {
  const rows: Array<[string, number]> = [
    ["Land acquisition", num(finance.landCost)],
    ["Civil construction", num(finance.constructionCost)],
    ["Plant & machinery", num(finance.machineryCost)],
    ["Installation", num(finance.installationCost)],
    ["Storage", num(finance.storageCost)],
    ["Setup", num(finance.setupCost)],
    ["Working capital", num(finance.workingCapital)],
    ["Operational expenses", num(finance.operationalExpenses)],
  ].filter(([, amount]) => amount > 0) as Array<[string, number]>

  const total = rows.reduce((sum, [, amount]) => sum + amount, 0) || target || 1
  return rows.map(([label, amount]) => ({
    label,
    pct: Math.round((amount / total) * 100),
    value: formatMoneyLabel(amount),
  }))
}

/**
 * Transform admin control-center dashboard into investor-facing CMS content.
 * Explicit pageContent fields win over derived construction/finance data.
 */
export function dashboardToFacilityContent(
  type: "plant" | "feed" | "ricemill",
  dashboard: SyncDashboardInput,
  project: SyncProjectInput,
): FacilityCmsContent {
  const page = normalizeFacilityContent(dashboard.pageContent || {})
  const fundingPct = dashboard.overview.fundingTarget > 0
    ? Math.min(100, Math.round((num(project.raised) / num(dashboard.overview.fundingTarget)) * 100))
    : 0
  const progress = Math.min(100, Math.round(num(dashboard.overview.overallProgress)))
  const activePlan = dashboard.investmentPlans.find(p => p.active) || dashboard.investmentPlans[0]

  const derivedStats = type === "plant" && page.stats?.length
    ? page.stats
    : [
        {
          label: "Funding Target",
          value: formatMoneyLabel(num(dashboard.overview.fundingTarget)),
          change: "Project capital goal",
          color: STAT_COLORS[0],
        },
        {
          label: "Capital Raised",
          value: formatMoneyLabel(num(project.raised)),
          change: `${fundingPct}% funded`,
          color: STAT_COLORS[1],
        },
        {
          label: "Overall Progress",
          value: `${progress}%`,
          change: "Construction / ops progress",
          color: STAT_COLORS[2],
        },
        {
          label: "Expected Completion",
          value: str(dashboard.overview.expectedCompletionDate, "—"),
          change: "Target date",
          color: STAT_COLORS[3],
        },
      ]

  const derivedUtilization: FacilityUtilizationRow[] = page.utilizationRows?.length
    ? page.utilizationRows
    : dashboard.investmentPlans.map(plan => {
        const capacity = num(plan.maxInvestment ?? plan.minInvestment)
        const current = num(plan.minInvestment)
        const pct = capacity > 0 ? Math.min(100, Math.round((current / capacity) * 100)) : 0
        return {
          label: plan.name,
          value: `${formatMoneyLabel(current)} / ${plan.maxInvestment == null ? "Open" : formatMoneyLabel(capacity)}`,
          pct: plan.maxInvestment == null ? Math.min(100, progress) : pct,
        }
      })

  const derivedTimeline: FacilityTimelineItem[] = page.timeline?.length
    ? page.timeline
    : dashboard.milestones.map(m => {
        const date = str(m.actualDate || m.expectedDate || m.startDate)
        const { year, q } = quarterFromDate(date)
        return {
          year,
          q,
          label: m.name,
          desc: str(m.description),
          done: m.status === "completed",
        }
      })

  const derivedStages: FacilityStage[] = page.processingStages?.length
    ? page.processingStages
    : dashboard.milestones.map((m, index) => normalizeStage({
        id: index + 1,
        label: m.name,
        desc: m.description,
        capacity: m.capacity || "—",
        status: m.status === "completed" ? "completed" : m.status === "in_progress" ? "partial" : "planned",
      }, index))

  const publishedUpdates = dashboard.updates.filter(u => u.published !== false)
  const derivedUpdates: FacilityOperationalUpdate[] = page.operationalUpdates?.length
    ? page.operationalUpdates
    : publishedUpdates.map(u => ({
        date: u.date,
        title: u.title,
        desc: u.description,
      }))

  const derivedProduction = page.productionData?.length
    ? page.productionData
    : deriveProductionFromFinance(dashboard.finance)

  const derivedOverview: FacilityOverviewDetail[] = page.overviewDetails?.length
    ? page.overviewDetails
    : [
        { label: "Industry", value: type === "plant" ? "Food Processing & IQF Export" : type === "ricemill" ? "Agriculture & Rice Processing" : "Agriculture & Animal Nutrition" },
        { label: "Location", value: str(project.location, "—") },
        { label: "Investment model", value: "Private Equity Investment" },
        { label: "Target investment", value: formatMoneyLabel(num(dashboard.overview.fundingTarget)) },
        { label: "Minimum investment", value: formatMoneyLabel(num(activePlan?.minInvestment ?? project.minInvestment)) },
        { label: "Expected annual ROI", value: str(project.roi, `${num(project.expectedReturnPct, activePlan?.roi ?? 0)}% projected`) },
        { label: "Investment period", value: activePlan ? `${activePlan.durationYears} years` : "—" },
        { label: "Profit distribution", value: "Quarterly" },
      ]

  const derivedAllocation = page.allocation?.length
    ? page.allocation
    : deriveAllocationFromFinance(dashboard.finance, num(dashboard.overview.fundingTarget))

  return {
    layoutTitle: page.layoutTitle || dashboard.overview.title || project.title,
    layoutSubtitle: page.layoutSubtitle
      || [project.location, dashboard.overview.statusLabel].filter(Boolean).join(" · "),
    projectStatus: page.projectStatus || dashboard.overview.statusLabel || str(project.status),
    projectCode: page.projectCode,
    utilizationBadge: page.utilizationBadge || `${fundingPct}% funded`,
    utilizationTitle: page.utilizationTitle,
    stats: page.stats?.length ? page.stats : derivedStats,
    utilizationRows: derivedUtilization,
    overviewTitle: page.overviewTitle || `The essential terms of ${project.title}`,
    overviewDetails: derivedOverview,
    processingStages: derivedStages,
    timelineTitle: page.timelineTitle || `${project.title} — development milestones`,
    timelineSubtitle: page.timelineSubtitle || "Project timeline",
    timeline: derivedTimeline,
    productionData: derivedProduction,
    operationalUpdates: derivedUpdates,
    allocation: derivedAllocation,
    allocationTitle: page.allocationTitle || "How capital is planned",
    whyThisProject: page.whyThisProject,
    faqs: page.faqs,
    hero: page.hero,
    footerCta: page.footerCta,
    investorProtections: page.investorProtections,
    downloadFilename: page.downloadFilename,
    downloadContents: page.downloadContents,
  }
}

/** Strip undefined keys before sending to the API. */
export function compactFacilityContent(content: FacilityCmsContent): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(content)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value) && value.length === 0) continue
    if (typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0) continue
    out[key] = value
  }
  return out
}
