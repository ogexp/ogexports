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
