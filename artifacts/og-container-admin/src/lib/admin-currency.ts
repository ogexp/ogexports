/**
 * Admin currency helpers — live USD-base rates + PKR display for Pakistan users.
 */
import { api } from "@/lib/api"
import { getSettings } from "@/lib/admin-data"
import { parsePlatformBool } from "@/lib/parse-platform-bool"
import {
  displayCurrencyContextFromApi,
  isPakistanCountry,
  isPkrDisplayUser,
  type DisplayCurrencyContext,
} from "@/lib/display-currency"

export type AdminUserCurrencyContext = DisplayCurrencyContext

export { isPkrDisplayUser, isPakistanCountry }

export interface AdminExchangeRates {
  base: string
  rates: Record<string, number>
  asOf: string | null
}

let ratesCache: AdminExchangeRates = {
  base: "USD",
  rates: { USD: 1, PKR: 278.5 },
  asOf: null,
}

export function getAdminExchangeRates(): AdminExchangeRates {
  return ratesCache
}

export function getPkrRate(): number {
  const rate = ratesCache.rates.PKR
  return Number.isFinite(rate) && rate > 0 ? rate : 278.5
}

export async function fetchAdminExchangeRates(): Promise<AdminExchangeRates> {
  try {
    const res: any = await api.get("/api/admin/finance/exchange-rates")
    const payload = res?.data ?? res
    ratesCache = {
      base: String(payload.base || "USD").toUpperCase(),
      rates: { USD: 1, ...(payload.rates || {}) },
      asOf: payload.as_of ?? payload.asOf ?? null,
    }
  } catch {
    // keep fallback cache
  }
  return ratesCache
}

export function userCurrencyContextFromApi(user?: any): AdminUserCurrencyContext | null {
  return displayCurrencyContextFromApi(user)
}

export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): number {
  const from = String(fromCurrency || "USD").toUpperCase()
  const to = String(toCurrency || "USD").toUpperCase()
  const num = Number(amount) || 0
  if (!Number.isFinite(num) || from === to) return num

  const rates = ratesCache.rates
  const fromRate = from === "USD" ? 1 : (rates[from] ?? null)
  const toRate = to === "USD" ? 1 : (rates[to] ?? null)
  if (!fromRate || !toRate) return num

  const usdAmount = from === "USD" ? num : num / fromRate
  const converted = to === "USD" ? usdAmount : usdAmount * toRate
  return to === "PKR" ? Math.round(converted) : Math.round(converted * 100) / 100
}

function formatCode(amount: number, currency: string): string {
  const code = String(currency || "USD").toUpperCase()
  const num = Number(amount) || 0
  const opts: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
  if (code === "USD") {
    return `$${num.toLocaleString(undefined, opts)}`
  }
  if (code === "PKR") {
    return `PKR ${num.toLocaleString(undefined, opts)}`
  }
  return `${code} ${num.toLocaleString(undefined, opts)}`
}

export interface FormatUserAmountOptions {
  /** When set and wallet currency is PKR, use this native amount instead of converting. */
  nativeAmount?: number | null
  /** Currency the stored/native amount is in. */
  sourceCurrency?: string | null
  /** For approved deposits: converted wallet amount. */
  convertedAmount?: number | null
  walletCurrency?: string | null
  /** Locked PKR amount from investment (preferred over live FX). */
  pkrAmount?: number | null
  /** Explicit USD amount when native is PKR or dual columns exist. */
  usdAmount?: number | null
  /**
   * Which platform PKR flag to apply.
   * investor → invest flags (+ dual); buyer/supplier → PKR-only or USD-only.
   */
  role?: "investor" | "buyer" | "supplier" | null
}

/**
 * Format an amount for admin display.
 * - investor: investPkrDisplayEnabled / investDualCurrencyEnabled
 * - buyer: buyerPkrDisplayEnabled (PKR only or USD only)
 * - supplier: supplierPkrDisplayEnabled (PKR only or USD only)
 * - Non-PK → USD
 */
export function formatUserAmount(
  amount: number | string | null | undefined,
  userCtx?: AdminUserCurrencyContext | null,
  options: FormatUserAmountOptions = {},
): string {
  const raw = typeof amount === "string"
    ? parseFloat(amount.replace(/[^0-9.-]/g, ""))
    : Number(amount)
  const num = Number.isFinite(raw) ? raw : 0

  const sourceCurrency = String(options.sourceCurrency || "USD").toUpperCase()
  const settings = getSettings()
  const role = options.role || "investor"

  let pkrDisplayEnabled: boolean
  let dualEnabled: boolean

  if (role === "buyer") {
    pkrDisplayEnabled = parsePlatformBool(settings.buyerPkrDisplayEnabled, true)
    dualEnabled = false
  } else if (role === "supplier") {
    pkrDisplayEnabled = parsePlatformBool(settings.supplierPkrDisplayEnabled, true)
    dualEnabled = false
  } else {
    pkrDisplayEnabled = parsePlatformBool(settings.investPkrDisplayEnabled, true)
    dualEnabled = parsePlatformBool(settings.investDualCurrencyEnabled, false)
  }

  const displayPkr = pkrDisplayEnabled && isPkrDisplayUser(userCtx)

  if (!displayPkr) {
    const usd = options.usdAmount != null && Number.isFinite(Number(options.usdAmount))
      ? Number(options.usdAmount)
      : (sourceCurrency === "USD" ? num : convertAmount(num, sourceCurrency, "USD"))
    return formatCode(usd, "USD")
  }

  const walletCurrency = String(
    options.walletCurrency || userCtx?.walletCurrency || userCtx?.currency || "PKR",
  ).toUpperCase()

  let pkrAmount: number
  let usdAmount: number

  if (
    options.convertedAmount != null
    && walletCurrency === "PKR"
    && Number.isFinite(Number(options.convertedAmount))
  ) {
    pkrAmount = Number(options.convertedAmount)
    usdAmount = options.usdAmount != null && Number.isFinite(Number(options.usdAmount))
      ? Number(options.usdAmount)
      : convertAmount(pkrAmount, "PKR", "USD")
  } else if (options.nativeAmount != null && Number.isFinite(Number(options.nativeAmount))) {
    const native = Number(options.nativeAmount)
    const nativeCurrency = String(options.sourceCurrency || walletCurrency).toUpperCase()
    if (nativeCurrency === "PKR") {
      pkrAmount = native
      usdAmount = options.usdAmount != null && Number.isFinite(Number(options.usdAmount))
        ? Number(options.usdAmount)
        : convertAmount(native, "PKR", "USD")
    } else {
      usdAmount = nativeCurrency === "USD" ? native : convertAmount(native, nativeCurrency, "USD")
      pkrAmount = options.pkrAmount != null && Number.isFinite(Number(options.pkrAmount))
        ? Number(options.pkrAmount)
        : convertAmount(usdAmount, "USD", "PKR")
    }
  } else if (sourceCurrency === "PKR") {
    pkrAmount = num
    usdAmount = options.usdAmount != null && Number.isFinite(Number(options.usdAmount))
      ? Number(options.usdAmount)
      : convertAmount(num, "PKR", "USD")
  } else {
    usdAmount = options.usdAmount != null && Number.isFinite(Number(options.usdAmount))
      ? Number(options.usdAmount)
      : (sourceCurrency === "USD" ? num : convertAmount(num, sourceCurrency, "USD"))
    pkrAmount = options.pkrAmount != null && Number.isFinite(Number(options.pkrAmount))
      ? Number(options.pkrAmount)
      : convertAmount(usdAmount, "USD", "PKR")
  }

  if (!dualEnabled) {
    return formatCode(pkrAmount, "PKR")
  }

  return `${formatCode(pkrAmount, "PKR")} (${formatCode(usdAmount, "USD")})`
}

/** Always USD primary; append PKR equivalent when `withPkr` is true. */
export function formatAdminUsd(
  amount: number | string | null | undefined,
  withPkr = false,
): string {
  const raw = typeof amount === "string"
    ? parseFloat(amount.replace(/[^0-9.-]/g, ""))
    : Number(amount)
  const num = Number.isFinite(raw) ? raw : 0
  const usd = formatCode(num, "USD")
  if (!withPkr) return usd
  const pkr = formatCode(convertAmount(num, "USD", "PKR"), "PKR")
  return `${usd} (${pkr})`
}

/** Format CRM lead value strings (may include $ prefix). */
export function formatLeadValue(
  value: string | number | null | undefined,
  country?: string | null,
): string {
  if (value == null || value === "" || value === "—") return "—"
  const raw = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""))
  if (!Number.isFinite(raw)) return String(value)

  const ctx: AdminUserCurrencyContext = {
    country,
    currency: isPakistanCountry(country) ? "PKR" : "USD",
    displayPkr: isPakistanCountry(country),
  }
  const hasUsdPrefix = typeof value === "string" && /^\s*\$/.test(value)
  const sourceCurrency = hasUsdPrefix || !isPakistanCountry(country) ? "USD" : "PKR"
  return formatUserAmount(raw, ctx, { sourceCurrency })
}

/** Project detail pane — format per-investor amounts. */
export function formatProjectInvestmentAmount(
  amount: number,
  investor?: any,
  options?: { pkrAmount?: number | null; usdAmount?: number | null },
): string {
  const ctx = userCurrencyContextFromApi(investor)
  const pkrAmount = options?.pkrAmount ?? investor?.amount_pkr ?? investor?.amountPkr ?? null
  const usdAmount = options?.usdAmount ?? amount
  // Container investments store canonical USD in `amount` with optional amount_pkr.
  const sourceCurrency = pkrAmount != null
    ? "USD"
    : (investor?.amount_currency
      || investor?.wallet_currency
      || ctx?.walletCurrency
      || ctx?.currency
      || "USD")
  return formatUserAmount(amount, ctx, {
    nativeAmount: amount,
    sourceCurrency,
    pkrAmount,
    usdAmount,
  })
}
