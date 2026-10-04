/**
 * payment-methods-admin.ts
 * Admin-managed payment method lookup values backed by Laravel API (in-memory cache).
 */
import { api, unwrapList } from "@/lib/api"

export interface PaymentMethodRow {
  id: string
  code: string
  label: string
  description: string
  badge: string
  fields: string[]
  sortOrder: number
  isActive: boolean
}

let cache: PaymentMethodRow[] = []
let synced = false
let syncPromise: Promise<void> | null = null

function mapPaymentMethod(raw: any): PaymentMethodRow {
  const fields = Array.isArray(raw.fields)
    ? raw.fields.map((f: any) => String(f || "")).filter(Boolean)
    : []
  return {
    id: String(raw.id),
    code: raw.code || "",
    label: raw.label || "",
    description: raw.description || "",
    badge: raw.badge || "",
    fields,
    sortOrder: Number(raw.sort_order ?? raw.sortOrder ?? 0),
    isActive: raw.is_active !== undefined ? Boolean(raw.is_active) : (raw.isActive !== false),
  }
}

function toApiPayload(data: Partial<PaymentMethodRow> | Omit<PaymentMethodRow, "id">) {
  const payload: Record<string, unknown> = {}
  if ("code" in data && data.code !== undefined) payload.code = data.code
  if ("label" in data && data.label !== undefined) payload.label = data.label
  if ("description" in data && data.description !== undefined) payload.description = data.description || null
  if ("badge" in data && data.badge !== undefined) payload.badge = data.badge || null
  if ("fields" in data && data.fields !== undefined) {
    payload.fields = (data.fields || []).map(f => String(f || "").trim()).filter(Boolean).slice(0, 2)
  }
  if ("sortOrder" in data && data.sortOrder !== undefined) payload.sort_order = data.sortOrder
  if ("isActive" in data && data.isActive !== undefined) payload.is_active = data.isActive
  return payload
}

async function fetchPaymentMethods(): Promise<PaymentMethodRow[]> {
  const res = await api.get("/api/admin/payment-methods")
  return unwrapList(res).map(mapPaymentMethod)
}

export async function refreshPaymentMethods(): Promise<void> {
  if (syncPromise) return syncPromise
  syncPromise = (async () => {
    try {
      cache = await fetchPaymentMethods()
      synced = true
    } catch {
      /* keep existing cache */
    } finally {
      syncPromise = null
    }
  })()
  return syncPromise
}

export function getPaymentMethods(): PaymentMethodRow[] {
  if (!synced) void refreshPaymentMethods()
  return cache
}

export function addPaymentMethod(data: Omit<PaymentMethodRow, "id">): PaymentMethodRow {
  const optimistic: PaymentMethodRow = { ...data, id: `pm-${Date.now()}` }
  cache = [...cache, optimistic].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))

  void api.post("/api/admin/payment-methods", toApiPayload(data))
    .then((res: any) => {
      const mapped = mapPaymentMethod(res?.data ?? res)
      cache = cache
        .map(row => (row.id === optimistic.id ? mapped : row))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
      synced = true
    })
    .catch(() => { void refreshPaymentMethods() })

  return optimistic
}

export function updatePaymentMethod(id: string, data: Partial<PaymentMethodRow>) {
  const idx = cache.findIndex(row => row.id === id)
  if (idx === -1) return
  cache[idx] = { ...cache[idx], ...data }
  cache = [...cache].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))

  void api.put(`/api/admin/payment-methods/${id}`, toApiPayload(data))
    .then((res: any) => {
      const mapped = mapPaymentMethod(res?.data ?? res)
      cache = cache
        .map(row => (row.id === id ? mapped : row))
        .sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
    })
    .catch(() => { void refreshPaymentMethods() })
}

export function deletePaymentMethod(id: string) {
  cache = cache.filter(row => row.id !== id)

  void api.delete(`/api/admin/payment-methods/${id}`)
    .catch(() => { void refreshPaymentMethods() })
}
