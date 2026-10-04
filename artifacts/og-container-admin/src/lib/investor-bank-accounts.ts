export type InvestorBankAccount = {
  id: string
  bank_name: string
  account_holder: string
  account_number: string
  iban: string
  swift: string
  branch: string
  currency: string
  is_default: boolean
}

export function createEmptyBankAccount(currency = "USD"): InvestorBankAccount {
  return {
    id: crypto.randomUUID(),
    bank_name: "",
    account_holder: "",
    account_number: "",
    iban: "",
    swift: "",
    branch: "",
    currency,
    is_default: false,
  }
}

export function hasUsableBankAccount(account: Partial<InvestorBankAccount> | null | undefined): boolean {
  if (!account) return false
  return Boolean(
    String(account.bank_name || "").trim() ||
    String(account.account_number || "").trim() ||
    String(account.iban || "").trim()
  )
}

export function normalizeBankAccount(
  raw: Partial<InvestorBankAccount> & Record<string, unknown>,
  fallbackCurrency = "USD",
): InvestorBankAccount {
  return {
    id: String(raw.id || crypto.randomUUID()),
    bank_name: String(raw.bank_name || raw.bank || raw.name || ""),
    account_holder: String(raw.account_holder || raw.holder || ""),
    account_number: String(raw.account_number || raw.account || ""),
    iban: String(raw.iban || ""),
    swift: String(raw.swift || ""),
    branch: String(raw.branch || ""),
    currency: String(raw.currency || fallbackCurrency).toUpperCase(),
    is_default: Boolean(raw.is_default),
  }
}

export function ensureDefaultBankAccount(accounts: InvestorBankAccount[]): InvestorBankAccount[] {
  if (accounts.length === 0) return []
  const hasDefault = accounts.some(a => a.is_default && hasUsableBankAccount(a))
  if (!hasDefault || accounts.length === 1) {
    return accounts.map((a, i) => ({ ...a, is_default: i === 0 }))
  }
  let seen = false
  return accounts.map(a => {
    if (a.is_default && !seen) {
      seen = true
      return { ...a, is_default: true }
    }
    return { ...a, is_default: false }
  })
}

export function defaultBankAccount(accounts: InvestorBankAccount[]): InvestorBankAccount | null {
  const def = accounts.find(a => a.is_default && hasUsableBankAccount(a))
  if (def) return def
  return accounts.find(a => hasUsableBankAccount(a)) || null
}
