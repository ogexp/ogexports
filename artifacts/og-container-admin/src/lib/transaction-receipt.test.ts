import assert from "node:assert/strict"
import test from "node:test"
import { createTransactionReceipt, transactionReceiptHtml } from "./transaction-receipt.ts"

test("deposit receipt uses only server fields and does not treat approval as wallet credit", () => {
  const receipt = createTransactionReceipt("deposit", {
    id: 31,
    reference: "DEP<&31",
    amount: 0,
    currency: "USD",
    review_status: "approved",
    created_at: "2026-10-07T10:15:00Z",
  })

  assert.equal(receipt.reference, "DEP<&31")
  assert.equal(receipt.amount, "0")
  assert.equal(receipt.submittedAt, "2026-10-07T10:15:00Z")
  assert.match(receipt.statusNote, /does not confirm that the wallet was credited/)
  const html = transactionReceiptHtml(receipt)
  assert.match(html, /DEP&lt;&amp;31/)
  assert.match(html, /0 USD/)
  assert.match(html, /Server status/)
})

test("missing transaction fields are explicitly marked unavailable", () => {
  const receipt = createTransactionReceipt("investment", { status: "pending" })
  const html = transactionReceiptHtml(receipt)

  assert.equal(receipt.reference, "")
  assert.equal(receipt.amount, "")
  assert.equal(receipt.submittedAt, "")
  assert.match(html, /Server reference<\/th><td>Not provided/)
  assert.match(html, /Amount returned by OG Exports<\/th><td>Not provided/)
  assert.match(html, /Date returned by OG Exports<\/th><td>Not provided/)
  assert.match(receipt.statusNote, /does not confirm settlement/)
})

test("investment receipts recognize investment-specific amount and status fields", () => {
  const receipt = createTransactionReceipt("investment", {
    id: 55,
    investment_reference: "INV-55",
    invested_amount: "250",
    amount_currency: "USD",
    investment_status: "active",
    invested_at: "2026-10-07",
  })

  assert.equal(receipt.reference, "INV-55")
  assert.equal(receipt.amount, "250")
  assert.equal(receipt.currency, "USD")
  assert.equal(receipt.status, "active")
  assert.match(receipt.statusNote, /does not mean the investment is settled or complete/)
})

test("withdrawal receipt includes only returned fee and wallet-debit values", () => {
  const receipt = createTransactionReceipt("withdrawal", {
    withdraw_id: "WITH-9",
    amount: "120",
    currency: "USD",
    fee: 2,
    total_debit: 122,
    status: "approved",
  })
  const html = transactionReceiptHtml(receipt)

  assert.match(html, /WITH-9/)
  assert.match(html, /120 USD/)
  assert.match(html, /2 USD/)
  assert.match(html, /122 USD/)
  assert.match(receipt.statusNote, /does not confirm that funds were transferred/)
})
