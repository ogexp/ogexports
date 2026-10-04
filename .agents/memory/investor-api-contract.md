---
name: OG Exports investor API contract
description: Verified financial and verification limits in the investor API.
---

Use the Laravel investor-data API as the source of truth for portfolio and account data. Its dashboard provides real portfolio history points derived from investment and profit-distribution records. The withdrawal response includes status, reference, and amount, and may include USD conversion/rate, but it does not provide fee or net-payout fields. That API has no phone-verification route. The user has explicitly approved clearly tagged illustrative values for missing dashboard figures.

**Why:** Investor screens must not imply financial estimates, verification steps, or server capabilities that the API does not provide.

**How to apply:** Live API fields (including zero) always win. Only after the authenticated dashboard query completes, the home dashboard may show an explicit demo fallback for a missing numeric summary or wallet field; tag each sample DEMO and show a clear not-real-data notice. Keep chart history, opportunities, transactions, and payout dates/amounts API-only. Never calculate or infer missing fees, payouts, currencies, verification states, or historical values.