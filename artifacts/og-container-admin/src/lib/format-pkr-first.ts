/**
 * Pure PKR/USD amount formatters (no React).
 * Pakistani dual on: `PKR … ($…)` — dual off: `PKR …` only.
 */

export const PKR_RATE = 278.5 // fallback: 1 USD = 278.5 PKR

let ratesCache: { rates: Record<string, number>; asOf: string | null } = {
  rates: { USD: 1, PKR: PKR_RATE },
  asOf: null,
}

export function getCachedPkrRate(): number {
  const rate = ratesCache.rates.PKR
  return Number.isFinite(rate) && rate > 0 ? rate : PKR_RATE
}

/** Update the in-memory FX cache (used by useCurrency after fetching rates). */
export function setRatesCache(rates: Record<string, number>, asOf: string | null = null): void {
  ratesCache = {
    rates: { USD: 1, ...rates },
    asOf,
  }
}

export function getRatesCacheAsOf(): string | null {
  return ratesCache.asOf
}

const LOCALE_OPTS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

export function formatMoneyCode(amount: number, currency: string): string {
  const code = String(currency || "USD").toUpperCase()
  const n = Number(amount) || 0
  if (code === "USD") return `$${n.toLocaleString(undefined, LOCALE_OPTS)}`
  if (code === "PKR") return `PKR ${n.toLocaleString(undefined, LOCALE_OPTS)}`
  return `${code} ${n.toLocaleString(undefined, LOCALE_OPTS)}`
}

export interface FormatPkrFirstOptions {
  /** Stored PKR amount (locked FX). When missing, converts from USD using live/fallback rate. */
  pkrAmount?: number | null
  /** Override rate (1 USD = X PKR). Defaults to cached live rate. */
  rate?: number | null
  /** Force dual PKR-first display when true. Default: false → USD only. */
  isPK?: boolean
  /**
   * When false, PK users see PKR only (no USD bracket).
   * Defaults to true (show both currencies).
   */
  dualEnabled?: boolean
}

/**
 * Pakistani users (dual on): `PKR 560,000.00 ($2,000.00)`
 * Pakistani users (dual off): `PKR 560,000.00`
 * International: `$2,000.00`
 */
export function formatPkrFirst(
  usdAmount: number | string | null | undefined,
  options: FormatPkrFirstOptions = {},
): string {
  const raw = typeof usdAmount === "string"
    ? parseFloat(usdAmount.replace(/[^0-9.-]/g, ""))
    : Number(usdAmount)
  const usd = Number.isFinite(raw) ? raw : 0
  const dualEnabled = options.dualEnabled !== false

  if (!options.isPK) {
    return formatMoneyCode(usd, "USD")
  }

  const rate = options.rate != null && Number(options.rate) > 0
    ? Number(options.rate)
    : getCachedPkrRate()

  const pkr = options.pkrAmount != null && Number.isFinite(Number(options.pkrAmount))
    ? Number(options.pkrAmount)
    : Math.round(usd * rate * 100) / 100

  const pkrLabel = formatMoneyCode(pkr, "PKR")
  if (!dualEnabled) return pkrLabel

  return `${pkrLabel} (${formatMoneyCode(usd, "USD")})`
}
