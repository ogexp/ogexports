/**
 * Assertions for formatPkrFirst dual-currency off/on behavior.
 * Pure helpers only (no React). Run from frontend/:
 *   npx --yes tsx src/lib/format-pkr-first.test.ts
 */
import assert from "node:assert/strict"
import { formatPkrFirst } from "./format-pkr-first.ts"

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

console.log("format-pkr-first.test.ts: all assertions passed")
