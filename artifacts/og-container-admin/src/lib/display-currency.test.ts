import assert from "node:assert/strict"
import { isPkrDisplayUser } from "./display-currency.ts"

assert.equal(
  isPkrDisplayUser({ country: "Pakistan" }),
  false,
  "investor display defaults to USD when the API has no currency",
)
assert.equal(
  isPkrDisplayUser({ country: "Pakistan", currency: "EUR" }),
  false,
  "Profile currency takes precedence over location",
)
assert.equal(
  isPkrDisplayUser({ country: "United States", walletCurrency: "PKR" }),
  true,
  "server wallet currency takes precedence over location",
)
assert.equal(
  isPkrDisplayUser({ country: "Pakistan" }, "supplier"),
  true,
  "supplier country-based behavior remains unchanged",
)
assert.equal(
  isPkrDisplayUser({ country: "Pakistan" }, "buyer"),
  true,
  "buyer country-based behavior remains unchanged",
)

console.log("display-currency.test.ts: all assertions passed")
