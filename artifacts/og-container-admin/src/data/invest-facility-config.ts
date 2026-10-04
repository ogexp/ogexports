import type { LucideIcon } from "lucide-react"

export type FacilityStat = {
  label: string
  value: string
  change: string
  icon: LucideIcon
  color: string
}

export type FacilityUtilizationRow = {
  label: string
  value: string
  pct: number
}

export type FacilityStage = {
  id: number
  label: string
  desc: string
  capacity: string
  status: "operational" | "partial" | "planned" | "funding" | "completed"
  icon?: string
}

export type FacilityOpportunity = {
  id: string
  name: string
  desc: string
  capex: string
  roi: string
  fundingPct: number
  timeline: string
  status: "funding" | "active" | "completed"
  minInvestment: string
}

export type FacilityTimelineItem = {
  year: string
  q: string
  label: string
  desc: string
  done: boolean
}

export type FacilityOperationalUpdate = {
  date: string
  title: string
  desc: string
}

export type FacilityProductionPoint = {
  month: string
  output: number
  revenue: number
  profit: number
}

export type FacilityAllocationItem = {
  label: string
  pct: number
  value: string
}

export type FacilityOverviewDetail = {
  label: string
  value: string
}

export type FacilityBenefit = {
  title: string
  desc: string
}

export type FacilityFaq = {
  question: string
  answer: string
}

export type FacilityHero = {
  eyebrow: string
  title: string
  description: string
  investCta: string
  downloadCta: string
  meetingCta: string
}

export type FacilityFooterCta = {
  title: string
  description: string
  investLabel: string
  contactLabel: string
}

export type FacilityInvestorProtection = {
  value: string
  label: string
}

/** CMS payload stored in platform_settings.facility_content[type] */
export type FacilityCmsContent = {
  layoutTitle?: string
  layoutSubtitle?: string
  projectStatus?: string
  projectCode?: string
  hero?: Partial<FacilityHero>
  stats?: Omit<FacilityStat, "icon">[]
  utilizationBadge?: string
  utilizationTitle?: string
  utilizationRows?: FacilityUtilizationRow[]
  overviewTitle?: string
  overviewDetails?: FacilityOverviewDetail[]
  processingStages?: FacilityStage[]
  timelineTitle?: string
  timelineSubtitle?: string
  timeline?: FacilityTimelineItem[]
  productionData?: FacilityProductionPoint[]
  operationalUpdates?: FacilityOperationalUpdate[]
  allocation?: FacilityAllocationItem[]
  allocationTitle?: string
  whyThisProject?: FacilityBenefit[]
  faqs?: FacilityFaq[]
  footerCta?: Partial<FacilityFooterCta>
  investorProtections?: FacilityInvestorProtection[]
  downloadFilename?: string
  downloadContents?: string
}

export type InvestFacilityConfig = {
  layoutTitle: string
  layoutSubtitle: string
  projectCode: string
  projectStatus: string
  hero: FacilityHero
  stats: Omit<FacilityStat, "icon">[]
  utilizationBadge: string
  utilizationTitle?: string
  utilizationRows: FacilityUtilizationRow[]
  overviewTitle: string
  overviewDetails: FacilityOverviewDetail[]
  processingStages: FacilityStage[]
  /** @deprecated Opportunities are loaded from the API (InvestmentProject). Kept optional for backwards compat. */
  opportunities?: FacilityOpportunity[]
  timelineTitle: string
  timelineSubtitle: string
  timeline: FacilityTimelineItem[]
  productionData: FacilityProductionPoint[]
  operationalUpdates: FacilityOperationalUpdate[]
  allocation: FacilityAllocationItem[]
  allocationTitle: string
  whyThisProject: FacilityBenefit[]
  faqs: FacilityFaq[]
  footerCta: FacilityFooterCta
  investorProtections?: FacilityInvestorProtection[]
  downloadFilename: string
  downloadContents: string
  investCategory: "processing"
  /** DB project type for API fetch */
  apiProjectType: "ricemill" | "feed" | "plant"
}

export const DEFAULT_STAT_COLORS = [
  "text-emerald-500",
  "text-blue-500",
  "text-accent",
  "text-emerald-500",
] as const
