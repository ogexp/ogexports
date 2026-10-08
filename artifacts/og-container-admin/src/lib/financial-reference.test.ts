import assert from "node:assert/strict"
import test from "node:test"
import { copyCanonicalFinancialId, copyFinancialReference, resolveCanonicalFinancialId } from "./financial-reference.ts"

test("copies the converted server ID rather than a legacy URL ID", async () => {
  let copied = ""
  const id = await copyCanonicalFinancialId(
    { id: 10_000_042, legacy_url_id: 42 },
    async value => { copied = value },
  )

  assert.equal(id, "10000042")
  assert.equal(copied, "10000042")
})

test("uses a server transaction ID alias when the response omits id", async () => {
  let copied = ""
  const id = await copyCanonicalFinancialId(
    { transaction_id: "10000073", legacy_url_id: "73" },
    async value => { copied = value },
    ["id", "transaction_id"],
  )

  assert.equal(id, "10000073")
  assert.equal(copied, "10000073")
})

test("does not fall back to a route ID when the server response has no canonical ID", async () => {
  let writeCount = 0

  await assert.rejects(
    copyCanonicalFinancialId(
      { legacy_url_id: "91", reference: "DEP-91" },
      async () => { writeCount += 1 },
      ["id", "transaction_id"],
    ),
    /server-provided financial record ID/,
  )

  assert.equal(writeCount, 0)
  assert.equal(resolveCanonicalFinancialId({ id: 10_000_091, investment_id: 91 }, ["id", "investment_id"]), "10000091")
})

test("reports clipboard failures instead of claiming the copy succeeded", async () => {
  await assert.rejects(
    copyCanonicalFinancialId({ id: 10_000_001 }, async () => false),
    /Clipboard did not confirm the copy/,
  )
})

test("prefers the canonical server ID over any provided reference", async () => {
  let copied = ""
  const target = await copyFinancialReference(
    { id: 10_000_104, reference: "DEP-104" },
    async value => { copied = value },
    ["id", "transaction_id"],
    ["reference", "transaction_reference"],
  )

  assert.deepEqual(target, { value: "10000104", kind: "id" })
  assert.equal(copied, "10000104")
})

test("copies a server-provided reference only when the canonical ID is absent", async () => {
  let copied = ""
  const target = await copyFinancialReference(
    { legacy_url_id: "104", reference: "DEP-104" },
    async value => { copied = value },
    ["id", "transaction_id"],
    ["reference", "transaction_reference"],
  )

  assert.deepEqual(target, { value: "DEP-104", kind: "reference" })
  assert.equal(copied, "DEP-104")
})

test("never copies a legacy URL ID when the server returns no ID or reference", async () => {
  let writeCount = 0

  await assert.rejects(
    copyFinancialReference(
      { legacy_url_id: "104" },
      async () => { writeCount += 1 },
      ["id", "transaction_id"],
      ["reference", "transaction_reference"],
    ),
    /No server-provided financial ID or reference/,
  )

  assert.equal(writeCount, 0)
})
