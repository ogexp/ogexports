export const CONTAINER_PROJECT_STATUSES = [
  "funding",
  "investment_confirmed",
  "cargo_loaded",
  "in_transit",
  "custom_clearance",
  "settled",
  "cancelled",
] as const

export type ContainerProjectStatus = (typeof CONTAINER_PROJECT_STATUSES)[number]

export const CONTAINER_PROJECT_STATUS_LABELS: Record<ContainerProjectStatus, string> = {
  funding: "Funding",
  investment_confirmed: "Investment Confirmed",
  cargo_loaded: "Cargo Loaded",
  in_transit: "In Transit",
  custom_clearance: "Custom Clearance",
  settled: "Settled",
  cancelled: "Cancelled",
}

export const CONTAINER_EXPORT_STAGES = [
  "Funding",
  "Investment Confirmed",
  "Cargo Loaded",
  "In Transit",
  "Custom Clearance",
  "Settled",
] as const

const LEGACY_MAP: Record<string, ContainerProjectStatus> = {
  pending: "funding",
  ready_to_ship: "investment_confirmed",
  active: "investment_confirmed",
  shipping: "in_transit",
  in_transit: "in_transit",
  customs: "custom_clearance",
  custom_clearance: "custom_clearance",
  completed: "settled",
  settled: "settled",
  cancelled: "cancelled",
  canceled: "cancelled",
  funding: "funding",
  investment_confirmed: "investment_confirmed",
  cargo_loaded: "cargo_loaded",
}

export function normalizeContainerProjectStatus(status?: string | null): ContainerProjectStatus | string {
  const raw = String(status || "funding").toLowerCase()
  if (raw in CONTAINER_PROJECT_STATUS_LABELS) return raw as ContainerProjectStatus
  return LEGACY_MAP[raw] ?? raw
}

export function containerProjectStatusLabel(status?: string | null): string {
  const normalized = normalizeContainerProjectStatus(status)
  if (normalized in CONTAINER_PROJECT_STATUS_LABELS) {
    return CONTAINER_PROJECT_STATUS_LABELS[normalized as ContainerProjectStatus]
  }
  return status ? String(status) : "—"
}

export function containerProjectStageIndex(projectStatus?: string | null, investmentStatus?: string | null): number {
  const normalized = normalizeContainerProjectStatus(projectStatus)
  const map: Record<string, number> = {
    funding: 0,
    investment_confirmed: 1,
    cargo_loaded: 2,
    in_transit: 3,
    custom_clearance: 4,
    settled: 5,
    cancelled: 5,
  }
  if (normalized in map) return map[normalized as string]
  if (investmentStatus === "active") return 1
  if (investmentStatus === "pending") return 0
  return 0
}

export function containerProjectStatusBadgeStyle(status?: string | null): { bg: string; color: string } {
  switch (normalizeContainerProjectStatus(status)) {
    case "funding":
      return { bg: "#fffbeb", color: "#f59e0b" }
    case "investment_confirmed":
      return { bg: "#eff6ff", color: "#3b82f6" }
    case "cargo_loaded":
      return { bg: "#f0fdf4", color: "#059669" }
    case "in_transit":
      return { bg: "#eff6ff", color: "#2563eb" }
    case "custom_clearance":
      return { bg: "#fffbeb", color: "#d97706" }
    case "settled":
      return { bg: "#ecfdf5", color: "#0F3D2E" }
    case "cancelled":
      return { bg: "#fef2f2", color: "#ef4444" }
    default:
      return { bg: "#f8fafc", color: "#64748b" }
  }
}

export function containerProjectUiStatus(projectStatus?: string | null, investmentStatus?: string | null): string {
  if (investmentStatus === "cancelled") return "cancelled"
  const normalized = normalizeContainerProjectStatus(projectStatus)
  if (normalized === "funding") return "funding"
  if (normalized === "settled" || investmentStatus === "completed") return "completed"
  if (normalized === "in_transit") return "in_transit"
  if (normalized === "custom_clearance") return "customs"
  if (normalized === "cancelled") return "cancelled"
  if (investmentStatus === "pending") return "funding"
  return "active"
}

export function isContainerProjectInvestable(projectStatus?: string | null): boolean {
  return normalizeContainerProjectStatus(projectStatus) === "funding"
}
