/**
 * deposit-options-admin.ts
 * Admin-managed deposit "Invest In" options backed by linked investment projects.
 */
import { api, unwrapList } from "@/lib/api"

export interface DepositOptionRow {
  id: string
  title: string
  type: string
  status: string
  roiLabel: string
  expectedReturnPct: number
  targetAmount: number
  raisedAmount: number
  minInvestment: number
  sortOrder: number
  dashboardModule: string
  isActive: boolean
}

const PROJECT_TYPES = [
  { value: "container", label: "Container" },
  { value: "feed", label: "Feed Mill" },
  { value: "ricemill", label: "Rice Mill" },
  { value: "produce", label: "Produce" },
  { value: "plant", label: "Plant" },
  { value: "cold_storage", label: "Cold Storage" },
  { value: "domestic_trading", label: "Domestic Trading" },
] as const

const DASHBOARD_MODULES = [
  { value: "", label: "None" },
  { value: "feed", label: "Feed Mill" },
  { value: "ricemill", label: "Rice Mill" },
  { value: "yellow_maize", label: "Yellow Maize" },
] as const

export { PROJECT_TYPES, DASHBOARD_MODULES }

let cache: DepositOptionRow[] = []
let synced = false
let syncPromise: Promise<void> | null = null

function mapDepositOption(raw: any): DepositOptionRow {
  return {
    id: String(raw.id),
    title: raw.title || "",
    type: raw.type || "container",
    status: raw.status || "funding",
    roiLabel: raw.roi_label || raw.roiLabel || "",
    expectedReturnPct: Number(raw.expected_return_pct ?? raw.expectedReturnPct ?? 0),
    targetAmount: Number(raw.target_amount ?? raw.targetAmount ?? 0),
    raisedAmount: Number(raw.raised_amount ?? raw.raisedAmount ?? 0),
    minInvestment: Number(raw.min_investment ?? raw.minInvestment ?? 100),
    sortOrder: Number(raw.deposit_sort_order ?? raw.sortOrder ?? 0),
    dashboardModule: raw.dashboard_module || raw.dashboardModule || "",
    isActive: raw.is_active !== undefined
      ? Boolean(raw.is_active)
      : (raw.isActive !== undefined ? Boolean(raw.isActive) : !["paused", "draft", "cancelled"].includes(String(raw.status || "").toLowerCase())),
  }
}

function toApiPayload(data: Partial<DepositOptionRow> | Omit<DepositOptionRow, "id" | "status">) {
  const payload: Record<string, unknown> = {}
  if ("title" in data && data.title !== undefined) payload.title = data.title
  if ("type" in data && data.type !== undefined) payload.type = data.type
  if ("roiLabel" in data && data.roiLabel !== undefined) payload.roi_label = data.roiLabel
  if ("expectedReturnPct" in data && data.expectedReturnPct !== undefined) payload.expected_return_pct = data.expectedReturnPct
  if ("targetAmount" in data && data.targetAmount !== undefined) payload.target_amount = data.targetAmount
  if ("raisedAmount" in data && data.raisedAmount !== undefined) payload.raised_amount = data.raisedAmount
  if ("minInvestment" in data && data.minInvestment !== undefined) payload.min_investment = data.minInvestment
  if ("sortOrder" in data && data.sortOrder !== undefined) payload.deposit_sort_order = data.sortOrder
  if ("dashboardModule" in data && data.dashboardModule !== undefined) {
    payload.dashboard_module = data.dashboardModule || null
  }
  if ("isActive" in data && data.isActive !== undefined) payload.is_active = data.isActive
  return payload
}

async function fetchDepositOptions(): Promise<DepositOptionRow[]> {
  const res = await api.get("/api/admin/deposit-options")
  return unwrapList(res).map(mapDepositOption)
}

export async function refreshDepositOptions(): Promise<void> {
  if (syncPromise) return syncPromise
  syncPromise = (async () => {
    try {
      cache = await fetchDepositOptions()
      synced = true
    } catch {
      /* keep existing cache */
    } finally {
      syncPromise = null
    }
  })()
  return syncPromise
}

export function getDepositOptions(): DepositOptionRow[] {
  if (!synced) void refreshDepositOptions()
  return cache
}

export function addDepositOption(data: Omit<DepositOptionRow, "id" | "status">): DepositOptionRow {
  const optimistic: DepositOptionRow = {
    ...data,
    id: `deposit-opt-${Date.now()}`,
    status: data.isActive ? "funding" : "paused",
  }
  cache = [...cache, optimistic].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))

  void api.post("/api/admin/deposit-options", toApiPayload(data))
    .then((res: any) => {
      const mapped = mapDepositOption(res?.data ?? res)
      cache = cache
        .map(row => (row.id === optimistic.id ? mapped : row))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
      synced = true
    })
    .catch(() => { void refreshDepositOptions() })

  return optimistic
}

export function updateDepositOption(id: string, data: Partial<DepositOptionRow>) {
  const idx = cache.findIndex(row => row.id === id)
  if (idx === -1) return
  cache[idx] = { ...cache[idx], ...data }
  cache = [...cache].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))

  void api.put(`/api/admin/deposit-options/${id}`, toApiPayload(data))
    .then((res: any) => {
      const mapped = mapDepositOption(res?.data ?? res)
      cache = cache
        .map(row => (row.id === id ? mapped : row))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    })
    .catch(() => { void refreshDepositOptions() })
}

export function deleteDepositOption(id: string) {
  cache = cache.filter(row => row.id !== id)

  void api.delete(`/api/admin/deposit-options/${id}`)
    .catch(() => { void refreshDepositOptions() })
}
