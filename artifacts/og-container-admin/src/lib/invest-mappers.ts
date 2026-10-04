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
    shipping: "shipping",
    completed: "completed",
  }
  const mapped = statusMap[uiStatus]
    || legacyMap[p.status]
    || (isContainerProjectInvestable(p.status) ? "open" : "funded")

  return {
    id: p.id, slug: p.id,
    commodity: p.commodity || p.title, variety: p.variety || "",
    tradeDirection: "export",
    containerType: (p.containerType || "40ft") as ContainerInvestment["containerType"],
    containerValue: p.containerValue || p.target,
    containerNumber: p.containerNumber,
    origin: p.origin || "Pakistan", portOfLoading: p.portOfLoading || "Port Qasim",
    destination: p.destination || "", portOfDischarge: p.portOfDischarge || "",
    destinationCountry: p.destinationCountry || p.destination || "",
    destinationFlag: p.destinationFlag || "🌍",
    fundingDeadlineDate: p.fundingDeadlineDate || new Date().toISOString(),
    minInvestment: p.minInvestment || 100, maxInvestment: p.maxInvestment ?? null,
    currentFunding: p.raised, targetFunding: p.target,
    totalInvestors: p.investors, totalAmountInvested: p.raised,
    expectedReturnPct: p.expectedReturnPct || parseFloat(p.roi) || 8,
    investmentPeriodDays: p.investmentPeriodDays || 45,
    status: mapped,
    imageUrl: p.imageUrl || "", riskLevel: p.riskLevel || "low",
    productCategory: p.productCategory || p.commodity || "",
    description: p.description || "",
    incoterm: (p.incoterm || "FOB") as ContainerInvestment["incoterm"],
    paymentTerms: p.paymentTermsInvest || "LC at sight",
    shippingLine: p.shippingLine, vesselName: p.vessel,
    estimatedDepartureDate: p.etd, estimatedArrivalDate: p.eta,
    expectedProjectCompletionDate: p.completion, currentProjectStage: p.currentProjectStage,
  }
}

export function adminToLongTerm(p: AdminInvestProject): LongTermProject {
  const statusMap: Record<AdminInvestProject["status"], LongTermProject["status"]> = {
    funding: "open",
    active: "in-progress",
    shipping: "in-progress",
    completed: "completed",
  }
  const category: LongTermProject["category"] =
    p.type === "plant" ? "processing" : "fresh-produce"
  const months = p.investmentPeriodDays
    ? Math.max(1, Math.round(p.investmentPeriodDays / 30))
    : (p.type === "plant" ? 48 : 24)

  return {
    id: p.id,
    slug: p.id,
    name: p.title,
    category,
    shortDescription: p.description || `${p.title} — co-invest with OG Exports.`,
    fullDescription: p.description || `${p.title} — co-invest with OG Exports.`,
    fundingTarget: p.target,
    currentFunding: p.raised,
    minInvestment: p.minInvestment || 1000,
    maxInvestment: p.maxInvestment ?? 0,
    investmentPeriodMonths: months,
    expectedReturnPct: p.expectedReturnPct || parseFloat(p.roi) || 12,
    expectedCompletionDate: p.completion || "",
    riskLevel: p.riskLevel || "medium",
    status: statusMap[p.status] || "open",
    totalInvestors: p.investors,
    imageUrls: p.imageUrl ? [p.imageUrl] : [],
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
