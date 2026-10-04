/**
 * Shared PKR display detection — Pakistan profile investors see dual PKR + ($USD).
 * Wallet currency (PKR vs USD) only affects how amounts are converted, not whether dual display applies.
 */

export function isPakistanCountry(country?: string | null): boolean {
  return String(country || "").trim().toLowerCase() === "pakistan"
}

export interface DisplayCurrencyContext {
  country?: string | null
  currency?: string | null
  walletCurrency?: string | null
  displayPkr?: boolean | null
}

/**
 * True when amounts should show as `PKR … ($ …)`.
 * Pakistan profile country is authoritative; API `displayPkr` aligns with that rule.
 */
export function isPkrDisplayUser(ctx?: DisplayCurrencyContext | null): boolean {
  if (!ctx) return false
  if (isPakistanCountry(ctx.country)) return true
  if (ctx.displayPkr === true) return true
  if (ctx.displayPkr === false) return false
  const currency = String(ctx.walletCurrency || ctx.currency || "").toUpperCase()
  if (currency === "PKR") return true
  return false
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
