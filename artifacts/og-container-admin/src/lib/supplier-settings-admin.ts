/**
 * supplier-settings-admin.ts
 * Admin-managed supplier offer lookup values (certifications, packaging sizes, payment terms).
 */
import { api, unwrapList } from "@/lib/api"

export type SupplierMarket = "pakistan" | "international"

export interface SupplierSettingRow {
  id: string
  label: string
  market?: SupplierMarket
  sortOrder: number
  isActive: boolean
}

type Resource = "certifications" | "packaging-sizes" | "payment-terms"

const endpoints: Record<Resource, string> = {
  certifications: "/api/admin/supplier-certifications",
  "packaging-sizes": "/api/admin/supplier-packaging-sizes",
  "payment-terms": "/api/admin/supplier-payment-terms",
}

const caches: Record<Resource, SupplierSettingRow[]> = {
  certifications: [],
  "packaging-sizes": [],
  "payment-terms": [],
}

const synced: Record<Resource, boolean> = {
  certifications: false,
  "packaging-sizes": false,
  "payment-terms": false,
}

const syncPromises: Record<Resource, Promise<void> | null> = {
  certifications: null,
  "packaging-sizes": null,
  "payment-terms": null,
}

function mapRow(raw: any): SupplierSettingRow {
  return {
    id: String(raw.id),
    label: raw.label || "",
    market: raw.market || undefined,
    sortOrder: Number(raw.sort_order ?? raw.sortOrder ?? 0),
    isActive: raw.is_active !== undefined ? Boolean(raw.is_active) : raw.isActive !== false,
  }
}

function toApiPayload(data: Partial<SupplierSettingRow>) {
  const payload: Record<string, unknown> = {}
  if (data.label !== undefined) payload.label = data.label
  if (data.market !== undefined) payload.market = data.market
  if (data.sortOrder !== undefined) payload.sort_order = data.sortOrder
  if (data.isActive !== undefined) payload.is_active = data.isActive
  return payload
}

function sortRows(rows: SupplierSettingRow[]) {
  return [...rows].sort((a, b) => {
    const marketCmp = String(a.market || "").localeCompare(String(b.market || ""))
    if (marketCmp !== 0) return marketCmp
    return a.sortOrder - b.sortOrder || a.label.localeCompare(b.label)
  })
}

async function fetchResource(resource: Resource): Promise<SupplierSettingRow[]> {
  const res = await api.get(endpoints[resource])
  return unwrapList(res).map(mapRow)
}

async function refreshResource(resource: Resource): Promise<void> {
  if (syncPromises[resource]) return syncPromises[resource]!
  syncPromises[resource] = (async () => {
    try {
      caches[resource] = sortRows(await fetchResource(resource))
      synced[resource] = true
    } finally {
      syncPromises[resource] = null
    }
  })()
  return syncPromises[resource]!
}

function getResource(resource: Resource): SupplierSettingRow[] {
  if (!synced[resource]) void refreshResource(resource)
  return caches[resource]
}

async function addResource(resource: Resource, data: Omit<SupplierSettingRow, "id">): Promise<SupplierSettingRow> {
  const res: any = await api.post(endpoints[resource], toApiPayload(data))
  const mapped = mapRow(res?.data ?? res)
  caches[resource] = sortRows([...caches[resource], mapped])
  synced[resource] = true
  return mapped
}

async function updateResource(resource: Resource, id: string, data: Partial<SupplierSettingRow>): Promise<SupplierSettingRow> {
  const res: any = await api.put(`${endpoints[resource]}/${id}`, toApiPayload(data))
  const mapped = mapRow(res?.data ?? res)
  caches[resource] = sortRows(caches[resource].map(row => (row.id === id ? mapped : row)))
  return mapped
}

async function deleteResource(resource: Resource, id: string): Promise<void> {
  await api.delete(`${endpoints[resource]}/${id}`)
  caches[resource] = caches[resource].filter(row => row.id !== id)
}

export async function refreshSupplierCertifications() {
  return refreshResource("certifications")
}
export function getSupplierCertifications() {
  return getResource("certifications")
}
export async function addSupplierCertification(data: Omit<SupplierSettingRow, "id">) {
  return addResource("certifications", data)
}
export async function updateSupplierCertification(id: string, data: Partial<SupplierSettingRow>) {
  return updateResource("certifications", id, data)
}
export async function deleteSupplierCertification(id: string) {
  return deleteResource("certifications", id)
}

export async function refreshSupplierPackagingSizes() {
  return refreshResource("packaging-sizes")
}
export function getSupplierPackagingSizes() {
  return getResource("packaging-sizes")
}
export async function addSupplierPackagingSize(data: Omit<SupplierSettingRow, "id">) {
  return addResource("packaging-sizes", data)
}
export async function updateSupplierPackagingSize(id: string, data: Partial<SupplierSettingRow>) {
  return updateResource("packaging-sizes", id, data)
}
export async function deleteSupplierPackagingSize(id: string) {
  return deleteResource("packaging-sizes", id)
}

export async function refreshSupplierPaymentTerms() {
  return refreshResource("payment-terms")
}
export function getSupplierPaymentTerms() {
  return getResource("payment-terms")
}
export async function addSupplierPaymentTerm(data: Omit<SupplierSettingRow, "id">) {
  return addResource("payment-terms", data)
}
export async function updateSupplierPaymentTerm(id: string, data: Partial<SupplierSettingRow>) {
  return updateResource("payment-terms", id, data)
}
export async function deleteSupplierPaymentTerm(id: string) {
  return deleteResource("payment-terms", id)
}

export async function refreshAllSupplierSettings() {
  await Promise.all([
    refreshSupplierCertifications(),
    refreshSupplierPackagingSizes(),
    refreshSupplierPaymentTerms(),
  ])
}
