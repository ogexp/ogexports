/**
 * Assertions for formatPkrFirst dual-currency off/on behavior.
 * Pure helpers only (no React). Run from frontend/:
 *   npx --yes tsx src/lib/format-pkr-first.test.ts
 */
import assert from "node:assert/strict"
import {
  convertCachedCurrency,
  formatPkrFirst,
  getCachedCurrencyRate,
  setRatesCache,
} from "./format-pkr-first.ts"

assert.equal(
  formatPkrFirst(10, { isPK: true, pkrAmount: 1000, dualEnabled: false }),
  "PKR 1,000.00",
  "dual off → PKR only",
)
assert.ok(
  !formatPkrFirst(10, { isPK: true, pkrAmount: 1000, dualEnabled: false }).includes("$"),
  "dual off has no USD",
)
assert.equal(
  formatPkrFirst(10, { isPK: true, pkrAmount: 1000, dualEnabled: true }),
  "PKR 1,000.00 ($10.00)",
  "dual on → PKR with USD brackets",
)
assert.equal(
  formatPkrFirst(10, { isPK: false, pkrAmount: 1000, dualEnabled: true }),
  "$10.00",
  "non-PK → USD only",
)

setRatesCache({ pkr: 278.5, eur: 0.92, GBP: 0.79 }, "test")
assert.equal(getCachedCurrencyRate("EUR"), 0.92, "rates are normalized to uppercase")
assert.equal(convertCachedCurrency(100, "USD", "EUR"), 92)
assert.equal(convertCachedCurrency(92, "EUR", "USD"), 100)
assert.equal(convertCachedCurrency(100, "USD", "GBP"), 79)
assert.equal(convertCachedCurrency(100, "USD", "CAD"), null, "missing rates do not relabel values")

console.log("format-pkr-first.test.ts: all assertions passed")
