/**
 * incoterms-admin.ts
 * Admin-managed Incoterm lookup values backed by Laravel API (in-memory cache).
 */
import { api, unwrapList } from "@/lib/api"

export interface IncotermRow {
  id: string
  code: string
  label: string
  sortOrder: number
  isActive: boolean
}

let cache: IncotermRow[] = []
let synced = false
let syncPromise: Promise<void> | null = null

function mapIncoterm(raw: any): IncotermRow {
  return {
    id: String(raw.id),
    code: raw.code || "",
    label: raw.label || "",
    sortOrder: Number(raw.sort_order ?? raw.sortOrder ?? 0),
    isActive: raw.is_active !== undefined ? Boolean(raw.is_active) : (raw.isActive !== false),
  }
}

function toApiPayload(data: Partial<IncotermRow> | Omit<IncotermRow, "id">) {
  const payload: Record<string, unknown> = {}
  if ("code" in data && data.code !== undefined) payload.code = data.code
  if ("label" in data && data.label !== undefined) payload.label = data.label
  if ("sortOrder" in data && data.sortOrder !== undefined) payload.sort_order = data.sortOrder
  if ("isActive" in data && data.isActive !== undefined) payload.is_active = data.isActive
  return payload
}

async function fetchIncoterms(): Promise<IncotermRow[]> {
  const res = await api.get("/api/admin/incoterms")
  return unwrapList(res).map(mapIncoterm)
}

export async function refreshIncoterms(): Promise<void> {
  if (syncPromise) return syncPromise
  syncPromise = (async () => {
    try {
      cache = await fetchIncoterms()
      synced = true
    } catch {
      /* keep existing cache */
    } finally {
      syncPromise = null
    }
  })()
  return syncPromise
}

export function getIncoterms(): IncotermRow[] {
  if (!synced) void refreshIncoterms()
  return cache
}

export function addIncoterm(data: Omit<IncotermRow, "id">): IncotermRow {
  const optimistic: IncotermRow = { ...data, id: `incoterm-${Date.now()}` }
  cache = [...cache, optimistic].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))

  void api.post("/api/admin/incoterms", toApiPayload(data))
    .then((res: any) => {
      const mapped = mapIncoterm(res?.data ?? res)
      cache = cache
        .map(row => (row.id === optimistic.id ? mapped : row))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
      synced = true
    })
    .catch(() => { void refreshIncoterms() })

  return optimistic
}

export function updateIncoterm(id: string, data: Partial<IncotermRow>) {
  const idx = cache.findIndex(row => row.id === id)
  if (idx === -1) return
  cache[idx] = { ...cache[idx], ...data }
  cache = [...cache].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))

  void api.put(`/api/admin/incoterms/${id}`, toApiPayload(data))
    .then((res: any) => {
      const mapped = mapIncoterm(res?.data ?? res)
      cache = cache
        .map(row => (row.id === id ? mapped : row))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    })
    .catch(() => { void refreshIncoterms() })
}

export function deleteIncoterm(id: string) {
  cache = cache.filter(row => row.id !== id)

  void api.delete(`/api/admin/incoterms/${id}`)
    .catch(() => { void refreshIncoterms() })
}
