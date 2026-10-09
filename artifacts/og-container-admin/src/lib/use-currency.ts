/**
 * useCurrency — role-aware PKR / USD formatting for investors, suppliers, and buyers.
 *
 * - Investors: invest_pkr_display_enabled + dual option (PKR alone or PKR + USD)
 * - Suppliers / buyers: respective platform flags; PKR-only or USD-only (no dual)
 * - Live USD→PKR rate from `/api/exchange-rates` (auth) with investor wallet fallback
 */
import { useEffect, useMemo, useState } from "react"
import { useGetMe } from "@workspace/api-client-react"
import { useSafeAuth } from "@/lib/use-safe-auth"
import { api } from "@/lib/api"
import { usePlatformSettings } from "@/hooks/usePlatformSettings"
import {
  displayCurrencyContextFromApi,
  isPakistanCountry,
  isPkrDisplayUser,
} from "@/lib/display-currency"
import { parsePlatformBool } from "@/lib/parse-platform-bool"
import {
  formatMoneyCode,
  formatPkrFirst,
  getCachedPkrRate,
  setRatesCache,
} from "@/lib/format-pkr-first"

export { isPakistanCountry } from "@/lib/display-currency"
export {
  PKR_RATE,
  formatMoneyCode,
  formatPkrFirst,
  getCachedPkrRate,
  type FormatPkrFirstOptions,
} from "@/lib/format-pkr-first"

export type TradeCurrencyRole = "investor" | "supplier" | "buyer"

export async function fetchExchangeRates(): Promise<number> {
  try {
    const res: any = await api.get("/api/exchange-rates")
    const payload = res?.data ?? res
    const rates = payload?.rates || {}
    setRatesCache(rates, payload?.as_of ?? payload?.asOf ?? null)
  } catch {
    try {
      const res: any = await api.get("/api/investor/wallet/exchange-rates")
      const payload = res?.data ?? res
      const rates = payload?.rates || {}
      setRatesCache(rates, payload?.as_of ?? payload?.asOf ?? null)
    } catch {
      // keep fallback
    }
  }
  return getCachedPkrRate()
}

/** @deprecated Use fetchExchangeRates */
export async function fetchInvestorExchangeRates(): Promise<number> {
  return fetchExchangeRates()
}

function getCountryFromStorage(): string {
  try {
    const sessionRaw =
      localStorage.getItem("og-exports-session") ||
      sessionStorage.getItem("og-exports-session")
    if (!sessionRaw) return ""
    const { userId } = JSON.parse(sessionRaw)
    const users: Array<{ id: string; country?: string }> = JSON.parse(
      localStorage.getItem("og-exports-users") || "[]"
    )
    return users.find(u => u.id === userId)?.country || ""
  } catch {
    return ""
  }
}

function resolveRole(me: any, authRole?: string | null): TradeCurrencyRole {
  const raw = String(
    me?.accountType
    || me?.account_type
    || (Array.isArray(me?.roles) ? me.roles[0] : "")
    || authRole
    || "",
  ).toLowerCase()
  if (raw.includes("supplier")) return "supplier"
  if (raw.includes("buyer")) return "buyer"
  if (raw.includes("investor")) return "investor"
  return "investor"
}

const LOCALE_OPTS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

export interface FmtTradeOptions {
  usdAmount?: number | null
  pkrAmount?: number | null
  rate?: number | null
  sourceCurrency?: string | null
}

export interface CurrencyKit {
  role: TradeCurrencyRole
  isPK: boolean
  /** Platform setting: show PKR + ($USD) when true (investors only). */
  dualEnabled: boolean
  country: string
  /** Wallet ledger currency (PKR or USD, etc.) */
  walletCurrency: string
  sym: string
  symLabel: string
  flag: string
  label: string
  rate: number
  convert: (usd: number) => number
  fmt: (usd: number) => string
  fmtCompact: (usd: number) => string
  fmtNative: (amount: number) => string
  fmtNativeCompact: (amount: number) => string
  fmtNativeDual: (amount: number, lockedRate?: number | null) => string
  fmtWalletAmount: (amount: number, walletCurrencyOverride?: string | null, lockedRate?: number | null) => string
  fmtDual: (usd: number, pkrAmount?: number | null, lockedRate?: number | null) => string
  /**
   * Trade amounts with optional locked FX snapshots.
   * PKR display on → PKR only; off → USD only. Uses live rate when snapshots missing.
   */
  fmtTrade: (nativeAmount: number, options?: FmtTradeOptions) => string
  tickFmt: (v: number) => string
}

function buildCurrencyKit(
  country: string,
  pkrRate: number,
  isPK: boolean,
  walletCurrency: string,
  dualEnabled: boolean,
  role: TradeCurrencyRole,
): CurrencyKit {
  const walletCode = String(walletCurrency || (isPK ? "PKR" : "USD")).toUpperCase()
  const rate = isPK ? pkrRate : 1
  const sym = isPK ? "PKR" : "$"
  const symLabel = isPK ? "PKR" : "USD"
  const flag = isPK ? "🇵🇰" : "🌍"
  const label = isPK ? "Pakistani Rupee (PKR)" : "US Dollar (USD)"

  function convert(usd: number) {
    return usd * rate
  }

  function fmt(usd: number) {
    return formatPkrFirst(usd, { isPK, rate: isPK ? pkrRate : undefined, dualEnabled })
  }

  function fmtNative(amount: number) {
    const n = Number(amount) || 0
    if (isPK) return `PKR ${n.toLocaleString(undefined, LOCALE_OPTS)}`
    return `$${n.toLocaleString(undefined, LOCALE_OPTS)}`
  }

  function fmtCompact(usd: number) {
    return fmt(usd)
  }

  function fmtNativeCompact(amount: number) {
    return fmtNative(amount)
  }

  function fmtNativeDual(amount: number, lockedRate?: number | null) {
    if (!isPK) return fmtNative(amount)
    const pkr = Number(amount) || 0
    const effectiveRate = lockedRate != null && Number(lockedRate) > 0
      ? Number(lockedRate)
      : pkrRate
    const usd = effectiveRate > 0 ? Math.round((pkr / effectiveRate) * 100) / 100 : 0
    return formatPkrFirst(usd, {
      isPK: true,
      pkrAmount: pkr,
      rate: effectiveRate,
      dualEnabled,
    })
  }

  function fmtDual(usd: number, pkrAmount?: number | null, lockedRate?: number | null) {
    return formatPkrFirst(usd, {
      isPK,
      pkrAmount,
      rate: lockedRate ?? (isPK ? pkrRate : undefined),
      dualEnabled,
    })
  }

  function fmtWalletAmount(
    amount: number,
    walletCurrencyOverride?: string | null,
    lockedRate?: number | null,
  ) {
    const code = String(walletCurrencyOverride || walletCode).toUpperCase()
    const n = Number(amount) || 0
    const effectiveRate = lockedRate != null && Number(lockedRate) > 0
      ? Number(lockedRate)
      : pkrRate
    if (!isPK) {
      return code === "PKR"
        ? `$${(effectiveRate > 0 ? Math.round((n / effectiveRate) * 100) / 100 : n).toLocaleString(undefined, LOCALE_OPTS)}`
        : fmtNative(n)
    }
    if (code === "PKR") return fmtNativeDual(n, effectiveRate)
    return fmtDual(n, null, effectiveRate)
  }

  function fmtTrade(nativeAmount: number, options: FmtTradeOptions = {}) {
    const source = String(options.sourceCurrency || walletCode || "USD").toUpperCase()
    const n = Number(nativeAmount) || 0
    const effectiveRate = options.rate != null && Number(options.rate) > 0
      ? Number(options.rate)
      : pkrRate

    let usd: number
    let pkr: number

    if (options.usdAmount != null && Number.isFinite(Number(options.usdAmount))
      && options.pkrAmount != null && Number.isFinite(Number(options.pkrAmount))) {
      usd = Number(options.usdAmount)
      pkr = Number(options.pkrAmount)
    } else if (options.usdAmount != null && Number.isFinite(Number(options.usdAmount))) {
      usd = Number(options.usdAmount)
      pkr = options.pkrAmount != null && Number.isFinite(Number(options.pkrAmount))
        ? Number(options.pkrAmount)
        : Math.round(usd * effectiveRate * 100) / 100
    } else if (options.pkrAmount != null && Number.isFinite(Number(options.pkrAmount))) {
      pkr = Number(options.pkrAmount)
      usd = effectiveRate > 0 ? Math.round((pkr / effectiveRate) * 100) / 100 : 0
    } else if (source === "PKR") {
      pkr = n
      usd = effectiveRate > 0 ? Math.round((n / effectiveRate) * 100) / 100 : 0
    } else {
      usd = n
      pkr = Math.round(n * effectiveRate * 100) / 100
    }

    return isPK ? formatMoneyCode(pkr, "PKR") : formatMoneyCode(usd, "USD")
  }

  function tickFmt(v: number) {
    return fmt(v)
  }

  return {
    role, isPK, dualEnabled, country, walletCurrency: walletCode, sym, symLabel, flag, label, rate,
    convert, fmt, fmtCompact, fmtNative, fmtNativeCompact, fmtNativeDual, fmtWalletAmount, fmtDual, fmtTrade, tickFmt,
  }
}

export function useCurrency(): CurrencyKit {
  const { country: authCountry, isSignedIn, accountType } = useSafeAuth()
  const { data: me } = useGetMe({ query: { enabled: !!isSignedIn } })
  const {
    investPkrDisplayEnabled,
    investDualCurrencyEnabled,
    supplierPkrDisplayEnabled,
    buyerPkrDisplayEnabled,
  } = usePlatformSettings()

  const role = resolveRole(me, accountType)
  const meCtx = displayCurrencyContextFromApi(me)
  const country = (
    meCtx?.country
    || authCountry
    || getCountryFromStorage()
    || ""
  ).trim()

  const walletCurrency = String(
    meCtx?.walletCurrency
    || meCtx?.currency
    || (role === "investor"
      ? "USD"
      : isPakistanCountry(country) ? "PKR" : "USD"),
  ).toUpperCase()

  const meInvestPkrRaw = (me as any)?.investPkrDisplayEnabled
    ?? (me as any)?.invest_pkr_display_enabled
  const investPkrOn = meInvestPkrRaw !== undefined && meInvestPkrRaw !== null
    ? parsePlatformBool(meInvestPkrRaw, true)
    : parsePlatformBool(investPkrDisplayEnabled, true)

  const meSupplierPkrRaw = (me as any)?.supplierPkrDisplayEnabled
    ?? (me as any)?.supplier_pkr_display_enabled
  const supplierPkrOn = meSupplierPkrRaw !== undefined && meSupplierPkrRaw !== null
    ? parsePlatformBool(meSupplierPkrRaw, true)
    : parsePlatformBool(supplierPkrDisplayEnabled, true)

  const meBuyerPkrRaw = (me as any)?.buyerPkrDisplayEnabled
    ?? (me as any)?.buyer_pkr_display_enabled
  const buyerPkrOn = meBuyerPkrRaw !== undefined && meBuyerPkrRaw !== null
    ? parsePlatformBool(meBuyerPkrRaw, true)
    : parsePlatformBool(buyerPkrDisplayEnabled, true)

  const pakistanUser = isPakistanCountry(meCtx?.country ?? country)

  let isPK = false
  let dualEnabled = false

  if (role === "supplier") {
    isPK = supplierPkrOn && pakistanUser
    dualEnabled = false
  } else if (role === "buyer") {
    isPK = buyerPkrOn && pakistanUser
    dualEnabled = false
  } else {
    isPK = investPkrOn && isPkrDisplayUser({
      ...(meCtx ?? {}),
      country: meCtx?.country ?? country,
      walletCurrency: meCtx?.walletCurrency ?? walletCurrency,
    })
    const meDualRaw = (me as any)?.investDualCurrencyEnabled
      ?? (me as any)?.invest_dual_currency_enabled
    dualEnabled = meDualRaw !== undefined && meDualRaw !== null
      ? parsePlatformBool(meDualRaw, false)
      : parsePlatformBool(investDualCurrencyEnabled, false)
  }

  const [pkrRate, setPkrRate] = useState(getCachedPkrRate)

  useEffect(() => {
    if (!isSignedIn && !isPK) return
    let cancelled = false
    fetchExchangeRates().then((rate) => {
      if (!cancelled) setPkrRate(rate)
    })
    return () => { cancelled = true }
  }, [isSignedIn, isPK])

  return useMemo(
    () => buildCurrencyKit(country, pkrRate, isPK, walletCurrency, dualEnabled, role),
    [country, pkrRate, isPK, walletCurrency, dualEnabled, role],
  )
}
