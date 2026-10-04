/**
 * bank-accounts.ts
 * Admin-managed bank accounts backed by Laravel API (in-memory cache).
 * Investor deposit UI falls back to seeded HBL defaults until admin sync runs.
 */
import { api, unwrapList } from "@/lib/api"

export interface BankAccount {
  id: string
  bankName: string
  accountTitle: string
  accountNumber: string
  iban: string
  swift: string
  currency: string
  isDefault: boolean
  active: boolean
  notes?: string
}

const DEFAULTS: BankAccount[] = [
  {
    id: "bank-default-1",
    bankName: "Habib Bank Limited (HBL)",
    accountTitle: "OG Exports (Private) Limited",
    accountNumber: "7234567890123456",
    iban: "PK36HABB0000020003891069",
    swift: "HABBPKKA",
    currency: "USD / PKR",
    isDefault: true,
    active: true,
    notes: "Primary account for investor deposits",
  },
]

let cache: BankAccount[] = [...DEFAULTS]
let synced = false
let syncPromise: Promise<void> | null = null

function mapBank(raw: any): BankAccount {
  return {
    id: String(raw.id),
    bankName: raw.bank_name || raw.bankName || "",
    accountTitle: raw.account_title || raw.accountTitle || "",
    accountNumber: raw.account_number || raw.accountNumber || "",
    iban: raw.iban || "",
    swift: raw.swift || "",
    currency: raw.currency || "USD / PKR",
    isDefault: Boolean(raw.is_default ?? raw.isDefault),
    active: raw.is_active !== undefined ? Boolean(raw.is_active) : (raw.active !== false),
    notes: raw.notes || raw.instructions || undefined,
  }
}

function toApiPayload(data: Partial<BankAccount> | Omit<BankAccount, "id">) {
  const payload: Record<string, unknown> = {}
  if ("bankName" in data && data.bankName !== undefined) payload.bank_name = data.bankName
  if ("accountTitle" in data && data.accountTitle !== undefined) payload.account_title = data.accountTitle
  if ("accountNumber" in data && data.accountNumber !== undefined) payload.account_number = data.accountNumber
  if ("iban" in data && data.iban !== undefined) payload.iban = data.iban
  if ("swift" in data && data.swift !== undefined) payload.swift = data.swift
  if ("currency" in data && data.currency !== undefined) payload.currency = data.currency
  if ("isDefault" in data && data.isDefault !== undefined) payload.is_default = data.isDefault
  if ("active" in data && data.active !== undefined) payload.is_active = data.active
  if ("notes" in data && data.notes !== undefined) payload.notes = data.notes
  return payload
}

async function fetchBankAccounts(): Promise<BankAccount[]> {
  // Admin finance list (preferred when authenticated as admin)
  try {
    const res = await api.get("/api/admin/finance/bank-accounts")
    const list = unwrapList(res).map(mapBank)
    if (list.length) return list
  } catch { /* not admin or unavailable */ }

  // Investor-facing payment accounts (active only)
  try {
    const res = await api.get("/api/investor/payment-bank-accounts")
    const list = unwrapList(res).map(mapBank)
    if (list.length) return list
  } catch { /* not signed in or unavailable */ }

  // Public active accounts (no auth required)
  try {
    const res = await api.publicGet("/api/bank-accounts")
    const list = unwrapList(res).map(mapBank)
    if (list.length) return list
  } catch { /* unavailable */ }

  // Buyer payment bank accounts (active only) — legacy compatibility fallback
  try {
    const res = await api.get("/api/buyer/payments/bank-accounts")
    const list = unwrapList(res).map(mapBank)
    if (list.length) return list
  } catch { /* not buyer or unavailable */ }

  return []
}

export async function refreshBankAccounts(): Promise<void> {
  if (syncPromise) return syncPromise
  syncPromise = (async () => {
    try {
      const list = await fetchBankAccounts()
      cache = list
      synced = true
    } catch {
      /* keep defaults */
    } finally {
      syncPromise = null
    }
  })()
  return syncPromise
}

export function getBankAccounts(): BankAccount[] {
  if (!synced) void refreshBankAccounts()
  if (!synced) return cache.length ? cache : [...DEFAULTS]
  return cache.length ? cache : [...DEFAULTS]
}

export function getActiveBankAccounts(): BankAccount[] {
  return getBankAccounts().filter(b => b.active)
}

/** Fetch active bank accounts for the investor deposit page (direct API, no admin cache). */
export async function fetchInvestorPaymentBankAccounts(): Promise<BankAccount[]> {
  try {
    const res = await api.publicGet("/api/bank-accounts")
    const list = unwrapList(res).map(mapBank).filter(b => b.active)
    if (list.length) return list
  } catch { /* public endpoint unavailable */ }

  try {
    const res = await api.get("/api/investor/payment-bank-accounts")
    const list = unwrapList(res).map(mapBank).filter(b => b.active)
    if (list.length) return list
  } catch { /* investor endpoint unavailable */ }

  return [...DEFAULTS]
}

export function saveBankAccounts(accounts: BankAccount[]) {
  cache = accounts
  synced = true
}

export function addBankAccount(data: Omit<BankAccount, "id">): BankAccount {
  if (data.isDefault) cache.forEach(a => { a.isDefault = false })
  const optimistic: BankAccount = { ...data, id: `bank-${Date.now()}` }
  cache = [...cache, optimistic]

  void api.post("/api/admin/finance/bank-accounts", toApiPayload(data))
    .then((res: any) => {
      const mapped = mapBank(res?.data ?? res)
      cache = cache.map(a => (a.id === optimistic.id ? mapped : a))
      synced = true
    })
    .catch(() => { void refreshBankAccounts() })

  return optimistic
}

export function updateBankAccount(id: string, data: Partial<BankAccount>) {
  const idx = cache.findIndex(a => a.id === id)
  if (idx === -1) return
  if (data.isDefault) cache.forEach(a => { a.isDefault = false })
  cache[idx] = { ...cache[idx], ...data }
  cache = [...cache]

  void api.put(`/api/admin/finance/bank-accounts/${id}`, toApiPayload(data))
    .then((res: any) => {
      const mapped = mapBank(res?.data ?? res)
      cache = cache.map(a => (a.id === id ? mapped : a))
    })
    .catch(() => { void refreshBankAccounts() })
}

export function deleteBankAccount(id: string) {
  cache = cache.filter(a => a.id !== id)
  if (cache.length > 0 && !cache.some(a => a.isDefault)) {
    cache[0] = { ...cache[0], isDefault: true }
  }
  if (!cache.length) cache = [...DEFAULTS]

  void api.delete(`/api/admin/finance/bank-accounts/${id}`)
    .catch(() => { void refreshBankAccounts() })
}
