import assert from "node:assert/strict"
import test from "node:test"
import { resolveInvestorTransactionPaymentMethod } from "./investor-transaction-method.ts"

test("direct withdrawal details preserve an explicit API payment method", () => {
  assert.equal(
    resolveInvestorTransactionPaymentMethod([{ payment_method: "Wire Transfer" }], true),
    "Wire Transfer",
  )
})

test("direct withdrawal details use Bank Transfer when payment method is missing or blank", () => {
  assert.equal(resolveInvestorTransactionPaymentMethod([{ amount: 100 }], true), "Bank Transfer")
  assert.equal(resolveInvestorTransactionPaymentMethod([{ payment_method: "" }], true), "Bank Transfer")
  assert.equal(resolveInvestorTransactionPaymentMethod([{ method: "   " }], true), "Bank Transfer")
})

test("wallet-ledger withdrawal details preserve explicit methods in the record or metadata", () => {
  assert.equal(
    resolveInvestorTransactionPaymentMethod([{ type: "withdrawal", method: "bank_transfer" }, {}], true),
    "bank_transfer",
  )
  assert.equal(
    resolveInvestorTransactionPaymentMethod([{ type: "withdrawal" }, { payment_method: "Wise" }], true),
    "Wise",
  )
})

test("wallet-ledger withdrawal details default when payment methods are missing or blank", () => {
  assert.equal(
    resolveInvestorTransactionPaymentMethod([{ type: "withdrawal" }, { payment_method: "" }], true),
    "Bank Transfer",
  )
  assert.equal(
    resolveInvestorTransactionPaymentMethod([{ type: "payout" }, { method: "  " }], true),
    "Bank Transfer",
  )
})
