import { type ContainerInvestment, type LongTermProject } from "@/data/investments"
import { type AdminInvestProject } from "@/lib/admin-data"
import { containerProjectUiStatus, isContainerProjectInvestable } from "@/lib/container-project-statuses"

export function adminToContainer(p: AdminInvestProject): ContainerInvestment {
  const uiStatus = containerProjectUiStatus(p.status)
  const statusMap: Record<string, ContainerInvestment["status"]> = {
    funding: "open",
    active: "funded",
    in_transit: "shipping",
    customs: "shipping",
    completed: "completed",
    cancelled: "completed",
  }
  const legacyMap: Partial<Record<AdminInvestProject["status"], ContainerInvestment["status"]>> = {
    funding: "open",
    active: "funded",
    completed: "completed",
  }
  const mapped = statusMap[uiStatus]
    || legacyMap[p.status]
    || (isContainerProjectInvestable(p.status) ? "open" : "funded")

  return {
    id: p.id, slug: p.id,
    commodity: p.commodity || p.title, variety: p.variety || "",
    tradeDirection: p.tradeDirection,
    containerType: p.containerType as ContainerInvestment["containerType"],
    containerValue: p.containerValue ?? null,
    containerNumber: p.containerNumber,
    origin: p.origin || "", portOfLoading: p.portOfLoading,
    destination: p.destination || "", portOfDischarge: p.portOfDischarge || "",
    destinationCountry: p.destinationCountry || p.destination || "",
    destinationFlag: p.destinationFlag || "🌍",
    fundingDeadlineDate: p.fundingDeadlineDate || "",
    minInvestment: p.minInvestment ?? null, maxInvestment: p.maxInvestment ?? null,
    currentFunding: p.raisedAmountAvailable === false ? null : p.raised,
    targetFunding: p.targetAmountAvailable === false ? null : p.target,
    fundingPercentage: p.fundingPercentage ?? null,
    remainingAmount: p.remainingAmount ?? null,
    totalInvestors: p.investorCountAvailable === false ? null : p.investors,
    totalAmountInvested: p.raisedAmountAvailable === false ? null : p.raised,
    expectedReturnPct: p.expectedReturnPct ?? null,
    investmentPeriodDays: p.investmentPeriodDays ?? null,
    status: mapped,
    imageUrl: p.imageUrl || "", riskLevel: p.riskLevel,
    productCategory: p.productCategory || p.commodity || "",
    description: p.description || "",
    incoterm: p.incoterm as ContainerInvestment["incoterm"],
    paymentTerms: p.paymentTermsInvest,
    currency: p.currency,
    shippingLine: p.shippingLine, vesselName: p.vessel,
    estimatedDepartureDate: p.etd, estimatedArrivalDate: p.eta,
    expectedProjectCompletionDate: p.completion, currentProjectStage: p.currentProjectStage,
  }
}

export function adminToLongTerm(p: AdminInvestProject): LongTermProject {
  const statusMap: Partial<Record<AdminInvestProject["status"], LongTermProject["status"]>> = {
    funding: "open",
    active: "in-progress",
    investment_confirmed: "in-progress",
    cargo_loaded: "in-progress",
    in_transit: "in-progress",
    custom_clearance: "in-progress",
    settled: "completed",
    cancelled: "completed",
    completed: "completed",
  }
  const categoryByType: Record<AdminInvestProject["type"], LongTermProject["category"]> = {
    container: "infrastructure",
    produce: "fresh-produce",
    plant: "processing",
    feed: "feed",
    ricemill: "rice-mill",
    cold_storage: "cold-storage",
    domestic_trading: "domestic-trading",
  }
  const category = categoryByType[p.type]

  return {
    id: p.id,
    slug: p.id,
    name: p.title,
    category,
    shortDescription: p.description || `${p.title} — co-invest with OG Exports.`,
    fullDescription: p.description || `${p.title} — co-invest with OG Exports.`,
    fundingTarget: p.targetAmountAvailable === false ? null : p.target,
    currentFunding: p.raisedAmountAvailable === false ? null : p.raised,
    fundingPercentage: p.fundingPercentage ?? null,
    remainingAmount: p.remainingAmount ?? null,
    minInvestment: p.minInvestment ?? null,
    maxInvestment: p.maxInvestment ?? null,
    investmentPeriodMonths: null,
    investmentPeriodDays: p.investmentPeriodDays ?? null,
    expectedReturnPct: p.expectedReturnPct ?? null,
    expectedCompletionDate: p.completion || "",
    riskLevel: p.riskLevel,
    status: statusMap[p.status] || "open",
    totalInvestors: p.investorCountAvailable === false ? null : p.investors,
    imageUrls: p.imageUrl ? [p.imageUrl] : [],
    currency: p.currency,
    highlights: [],
    documents: [],
  }
}

export function formatInvestDate(d?: string | null): string {
  if (!d) return ""
  const date = new Date(d)
  if (Number.isNaN(date.getTime())) return ""
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}
