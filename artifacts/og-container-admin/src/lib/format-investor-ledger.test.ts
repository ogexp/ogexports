/**
 * Assertions for formatInvestorLedgerAmount.
 * Pure helpers only (no React). Run from frontend/:
 *   npx --yes tsx src/lib/format-investor-ledger.test.ts
 */
import assert from "node:assert/strict"
import { formatInvestorLedgerAmount, type InvestorLedgerCurrency } from "./format-investor-ledger.ts"
import { formatPkrFirst } from "./format-pkr-first.ts"

const LOCALE_OPTS: Intl.NumberFormatOptions = {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}

function mockCurrency(isPK: boolean, pkrRate = 278.5): InvestorLedgerCurrency {
  return {
    isPK,
    fmtDual: (usd, pkrAmount, lockedRate) =>
      formatPkrFirst(usd, {
        isPK,
        pkrAmount,
        rate: lockedRate ?? (isPK ? pkrRate : undefined),
        dualEnabled: true,
      }),
    fmtNative: (amount) => {
      const n = Number(amount) || 0
      if (isPK) return `PKR ${n.toLocaleString(undefined, LOCALE_OPTS)}`
      return `$${n.toLocaleString(undefined, LOCALE_OPTS)}`
    },
    fmtWalletAmount: (amount, walletCurrencyOverride, lockedRate) => {
      const code = String(walletCurrencyOverride || (isPK ? "PKR" : "USD")).toUpperCase()
      const n = Number(amount) || 0
      const effectiveRate = lockedRate != null && Number(lockedRate) > 0
        ? Number(lockedRate)
        : pkrRate
      if (!isPK) {
        if (code === "PKR") {
          const usd = effectiveRate > 0 ? Math.round((n / effectiveRate) * 100) / 100 : n
          return `$${usd.toLocaleString(undefined, LOCALE_OPTS)}`
        }
        return `$${n.toLocaleString(undefined, LOCALE_OPTS)}`
      }
      if (code === "PKR") {
        const usd = effectiveRate > 0 ? Math.round((n / effectiveRate) * 100) / 100 : 0
        return formatPkrFirst(usd, {
          isPK: true,
          pkrAmount: n,
          rate: effectiveRate,
          dualEnabled: true,
        })
      }
      return formatPkrFirst(n, { isPK: true, rate: effectiveRate, dualEnabled: true })
    },
  }
}

// PK display off + PKR ledger without usdAmount → convert via rate (not $2785)
assert.equal(
  formatInvestorLedgerAmount(mockCurrency(false), 2785, {
    ledgerCurrency: "PKR",
    lockedRate: 278.5,
  }),
  "$10.00",
  "USD-off converts PKR ledger to $10.00",
)

// PK display off + explicit usdAmount → use USD directly
assert.equal(
  formatInvestorLedgerAmount(mockCurrency(false), 2785, {
    usdAmount: 10,
    ledgerCurrency: "PKR",
  }),
  "$10.00",
  "USD-off with usdAmount uses USD",
)

// PK display on + usdAmount → dual
assert.equal(
  formatInvestorLedgerAmount(mockCurrency(true), 2785, {
    usdAmount: 10,
    lockedRate: 278.5,
  }),
  "PKR 2,785.00 ($10.00)",
  "PK on + usdAmount → dual",
)

// PK display on without usdAmount → wallet dual
assert.equal(
  formatInvestorLedgerAmount(mockCurrency(true), 2785, {
    ledgerCurrency: "PKR",
    lockedRate: 278.5,
  }),
  "PKR 2,785.00 ($10.00)",
  "PK on without usdAmount → fmtWalletAmount dual",
)

console.log("format-investor-ledger.test.ts: all assertions passed")
