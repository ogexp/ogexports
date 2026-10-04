---
name: OG Exports investor API contract
description: Verified financial and verification limits in the investor API.
---

Use the Laravel investor-data API as the source of truth for portfolio and account data. Its dashboard provides real portfolio history points derived from investment and profit-distribution records. The withdrawal response includes status, reference, and amount, and may include USD conversion/rate, but it does not provide fee or net-payout fields. That API has no phone-verification route. Never use sample/demo financial values or calculate missing figures.

**Why:** The OG Exports master prompt requires the backend to be the financial source of truth and explicitly forbids hard-coded financial values.

**How to apply:** Use API fields as supplied, including zero. When a required field is absent, show an unavailable state instead of a fallback or calculation. Keep chart history, opportunities, transactions, payout dates/amounts, fees, currencies, and verification states API-only.