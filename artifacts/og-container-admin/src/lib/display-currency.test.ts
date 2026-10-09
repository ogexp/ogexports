import assert from "node:assert/strict"
import { displayCurrencyContextFromApi, isPkrDisplayUser } from "./display-currency.ts"

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
  isPkrDisplayUser({ country: "United States", currency: "USD", walletCurrency: "PKR" }),
  false,
  "Profile currency takes precedence over a stale wallet denomination",
)
assert.equal(
  isPkrDisplayUser({ country: "United States", currency: "PKR", walletCurrency: "USD" }),
  true,
  "Profile-selected PKR remains the investor display currency",
)
assert.equal(
  isPkrDisplayUser({ country: "Pakistan", walletCurrency: "PKR", displayPkr: true }),
  false,
  "investors default to USD when the Profile currency is absent",
)
const apiContext = displayCurrencyContextFromApi({
  profile_currency: "EUR",
  currency: "PKR",
  display_currency: "PKR",
  wallet_currency: "USD",
})
assert.equal(apiContext?.currency, "EUR", "API Profile currency takes precedence over wallet/display currency")
assert.equal(apiContext?.walletCurrency, "USD", "actual wallet currency remains available as amount source metadata")
assert.equal(
  displayCurrencyContextFromApi({
    profile: { meta: { preferences: { currency: "GBP" } } },
    wallet_currency: "PKR",
  })?.currency,
  "GBP",
  "nested Profile preferences are recognized",
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
