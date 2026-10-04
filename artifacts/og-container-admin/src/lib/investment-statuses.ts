export type InvestmentStatus = "pending" | "active" | "completed" | "cancelled"

export type InvestmentStatusContext = {
  projectType?: string | null
  projectStatus?: string | null
}

export const INVESTMENT_STATUS_OPTIONS: InvestmentStatus[] = [
  "pending",
  "active",
  "completed",
  "cancelled",
]

export const INVESTMENT_STATUS_LABELS: Record<InvestmentStatus, string> = {
  pending: "Pending",
  active: "Active",
  completed: "Completed",
  cancelled: "Rejected",
}

const FUNDING_DISPLAY_LABEL = "Funding"

export function normalizeInvestmentStatus(status?: string | null): InvestmentStatus | string {
  const raw = String(status || "pending").toLowerCase()
  if (raw === "active" || raw === "approved") return "active"
  if (raw === "completed") return "completed"
  if (raw === "cancelled" || raw === "canceled" || raw === "rejected") return "cancelled"
  if (raw === "pending") return "pending"
  if (raw === "funding") return "funding"
  return raw
}

export function shouldShowFundingForPending(
  status?: string | null,
  context?: InvestmentStatusContext,
): boolean {
  if (normalizeInvestmentStatus(status) !== "pending") {
    return false
  }

  const projectType = String(context?.projectType || "").toLowerCase()

  return projectType === "container"
}

export function investmentDisplayStatus(
  status?: string | null,
  context?: InvestmentStatusContext,
): string {
  if (shouldShowFundingForPending(status, context)) {
    return "funding"
  }

  return String(normalizeInvestmentStatus(status))
}

export function investmentStatusLabel(
  status?: string | null,
  context?: InvestmentStatusContext,
): string {
  const display = investmentDisplayStatus(status, context)

  if (display === "funding") {
    return FUNDING_DISPLAY_LABEL
  }

  if (display in INVESTMENT_STATUS_LABELS) {
    return INVESTMENT_STATUS_LABELS[display as InvestmentStatus]
  }

  return status ? String(status) : "—"
}

export function investmentStatusBadgeStyle(
  status?: string | null,
  context?: InvestmentStatusContext,
): { bg: string; color: string } {
  switch (investmentDisplayStatus(status, context)) {
    case "funding":
    case "pending":
      return { bg: "#fffbeb", color: "#f59e0b" }
    case "active":
      return { bg: "#f0fdf4", color: "#4CAF50" }
    case "completed":
      return { bg: "#ecfdf5", color: "#0F3D2E" }
    case "cancelled":
      return { bg: "#fef2f2", color: "#ef4444" }
    default:
      return { bg: "#f8fafc", color: "#64748b" }
  }
}

export function investmentStatusBadgeClass(
  status?: string | null,
  context?: InvestmentStatusContext,
): string {
  switch (investmentDisplayStatus(status, context)) {
    case "funding":
    case "pending":
      return "bg-amber-500/15 text-amber-600"
    case "active":
      return "bg-emerald-500/15 text-emerald-600"
    case "completed":
      return "bg-emerald-500/10 text-emerald-700"
    case "cancelled":
      return "bg-destructive/15 text-destructive"
    default:
      return "bg-muted text-muted-foreground"
  }
}
