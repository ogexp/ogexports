/**
 * Shared investor-ledger amount formatter.
 * Routes through useCurrency helpers so admin PKR-display / dual toggles apply
 * consistently on dashboard, wallet, deposits, withdrawals, and reports.
 */

export interface InvestorLedgerCurrency {
  isPK: boolean
  fmtDual: (usd: number, pkrAmount?: number | null, lockedRate?: number | null) => string
  fmtNative: (amount: number) => string
  fmtWalletAmount: (
    amount: number,
    walletCurrencyOverride?: string | null,
    lockedRate?: number | null,
  ) => string
}

export interface FormatInvestorLedgerOptions {
  /** Explicit USD amount when known (preferred for dual / USD-only display). */
  usdAmount?: number | null
  /** Wallet ledger currency (PKR / USD). */
  ledgerCurrency?: string | null
  /** Locked or average PKR-per-USD rate. */
  lockedRate?: number | null
}

/**
 * Return a saved USD equivalent for a recorded wallet amount.
 * Prefer the API's stored equivalent; only convert PKR when a recorded
 * exchange-rate snapshot is available.
 */
export function savedUsdEquivalentForRecordedAmount(
  walletAmount: number | null,
  ledgerCurrency: string | null,
  storedUsdAmount: number | null,
  lockedRate: number | null,
): number | null {
  if (walletAmount == null || !Number.isFinite(walletAmount)) return null
  if (storedUsdAmount != null && Number.isFinite(storedUsdAmount)) return storedUsdAmount

  if (String(ledgerCurrency || "").trim().toUpperCase() !== "PKR") return null
  if (lockedRate == null || !Number.isFinite(lockedRate) || lockedRate <= 0) return null

  return Math.round((walletAmount / lockedRate) * 100) / 100
}

/**
 * Format a wallet-ledger amount for investor UI.
 * - PK display on + usdAmount → dual/PKR via fmtDual
 * - PK display off + usdAmount → USD via fmtNative
 * - Otherwise → fmtWalletAmount (converts PKR→USD when display is off)
 */
export function formatInvestorLedgerAmount(
  c: InvestorLedgerCurrency,
  walletAmount: number,
  options: FormatInvestorLedgerOptions = {},
): string {
  const amount = Number(walletAmount) || 0
  const usd = options.usdAmount
  const hasUsd = usd != null && Number.isFinite(Number(usd))
  const usdNum = hasUsd ? Number(usd) : null
  const rate = options.lockedRate

  if (c.isPK && usdNum != null) {
    return c.fmtDual(usdNum, amount, rate)
  }
  if (!c.isPK && usdNum != null) {
    return c.fmtNative(usdNum)
  }
  return c.fmtWalletAmount(amount, options.ledgerCurrency, rate)
}
