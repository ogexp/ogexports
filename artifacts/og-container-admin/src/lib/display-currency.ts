/** Shared PKR display detection for API-backed investor and trade amounts. */

export function isPakistanCountry(country?: string | null): boolean {
  return String(country || "").trim().toLowerCase() === "pakistan"
}

export interface DisplayCurrencyContext {
  country?: string | null
  /** Selected investor currency from Profile; the wallet must follow this. */
  currency?: string | null
  /** Current server wallet denomination, used only to interpret raw amounts. */
  walletCurrency?: string | null
  displayPkr?: boolean | null
}

export type DisplayCurrencyRole = "investor" | "buyer" | "supplier"

/**
 * True when amounts should use PKR display.
 * Investor display follows the selected Profile currency, never wallet metadata or location.
 * Supplier and buyer amounts may retain the existing country-based rule.
 */
export function isPkrDisplayUser(
  ctx?: DisplayCurrencyContext | null,
  role: DisplayCurrencyRole = "investor",
): boolean {
  if (!ctx) return false

  if (role === "investor") {
    return String(ctx.currency || "").trim().toUpperCase() === "PKR"
  }

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
  const profile = user.profile && typeof user.profile === "object" ? user.profile : {}
  const profileMeta = profile.meta && typeof profile.meta === "object" ? profile.meta : {}
  const profilePreferences = profileMeta.preferences && typeof profileMeta.preferences === "object"
    ? profileMeta.preferences
    : profile.preferences && typeof profile.preferences === "object"
      ? profile.preferences
      : user.preferences && typeof user.preferences === "object"
        ? user.preferences
        : {}
  return {
    country: user.country ?? user.profile?.country ?? null,
    currency: user.profile_currency
      ?? user.profileCurrency
      ?? profilePreferences.currency
      ?? user.currency
      ?? null,
    walletCurrency: user.wallet_currency ?? user.walletCurrency ?? user.wallet?.currency ?? null,
    displayPkr: user.display_pkr ?? user.displayPkr ?? null,
  }
}
