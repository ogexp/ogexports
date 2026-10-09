/** Shared PKR display detection for API-backed investor and trade amounts. */

export function isPakistanCountry(country?: string | null): boolean {
  return String(country || "").trim().toLowerCase() === "pakistan"
}

export interface DisplayCurrencyContext {
  country?: string | null
  currency?: string | null
  walletCurrency?: string | null
  displayPkr?: boolean | null
}

export type DisplayCurrencyRole = "investor" | "buyer" | "supplier"

/**
 * True when amounts should use PKR display.
 * Investor amounts use the server wallet/profile currency, never location.
 * Supplier and buyer amounts may retain the existing country-based rule.
 */
export function isPkrDisplayUser(
  ctx?: DisplayCurrencyContext | null,
  role: DisplayCurrencyRole = "investor",
): boolean {
  if (!ctx) return false

  const walletCurrency = String(ctx.walletCurrency || "").trim().toUpperCase()
  if (walletCurrency) return walletCurrency === "PKR"

  if (ctx.displayPkr === true) return true
  if (ctx.displayPkr === false) return false

  const currency = String(ctx.currency || "").trim().toUpperCase()
  if (currency) return currency === "PKR"

  return role !== "investor" && isPakistanCountry(ctx.country)
}

/** Build context from a `/api/me` (or similar) user payload. */
export function displayCurrencyContextFromApi(user?: any): DisplayCurrencyContext | null {
  if (!user || typeof user !== "object") return null
  return {
    country: user.country ?? user.profile?.country ?? null,
    currency: user.display_currency ?? user.displayCurrency ?? user.currency ?? null,
    walletCurrency: user.wallet_currency ?? user.walletCurrency ?? user.wallet?.currency ?? null,
    displayPkr: user.display_pkr ?? user.displayPkr ?? null,
  }
}
