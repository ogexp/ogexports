import assert from "node:assert/strict"
import {
  maximumWithdrawalPayout,
  parseInvestorWithdrawalTerms,
  withdrawalFeeTermsConfirmed,
} from "./investor-withdrawal-terms.ts"

const usdTerms = parseInvestorWithdrawalTerms({
  data: {
    withdrawal_fee: 2,
    withdrawal_fee_usd: 2,
    withdrawal_fee_currency: "USD",
    estimated_processing_time: "1 to 2 working days",
  },
})

assert.deepEqual(usdTerms, {
  fee: 2,
  feeUsd: 2,
  feeCurrency: "USD",
  processingTime: "1 to 2 working days",
})
assert.equal(withdrawalFeeTermsConfirmed(usdTerms, "USD"), true)

const pkrTerms = parseInvestorWithdrawalTerms({
  data: {
    wallet: {
      withdrawal_fee: 557,
      withdrawal_fee_usd: 2,
      withdrawal_fee_currency: "PKR",
      estimated_processing_time: "1 to 2 working days",
    },
  },
})
assert.equal(pkrTerms.fee, 557)
assert.equal(withdrawalFeeTermsConfirmed(pkrTerms, "PKR"), true)
assert.equal(withdrawalFeeTermsConfirmed(pkrTerms, "USD"), false)

assert.deepEqual(parseInvestorWithdrawalTerms({ data: {} }), {
  fee: null,
  feeUsd: null,
  feeCurrency: "",
  processingTime: "",
})
assert.equal(withdrawalFeeTermsConfirmed(parseInvestorWithdrawalTerms({}), "USD"), false)

assert.equal(maximumWithdrawalPayout(1750.33, 2), 1748.33)
assert.equal(maximumWithdrawalPayout(1.5, 2), 0)
assert.equal(maximumWithdrawalPayout(102, null), null)
assert.equal(maximumWithdrawalPayout(null, 2), null)

console.log("investor-withdrawal-terms.test.ts: all assertions passed")
