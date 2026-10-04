---
name: OG Exports investor API contract
description: Verified financial and verification limits in the investor API.
---

Use the Laravel investor API as the source of truth. Its dashboard provides real portfolio history points derived from investment and profit-distribution records. The withdrawal response includes status, reference, and amount, and may include USD conversion/rate, but it does not provide fee or net-payout fields. The registration API verifies email but has no phone-verification route.

**Why:** Investor screens must not imply financial estimates, verification steps, or server capabilities that the API does not provide.

**How to apply:** Render only returned values; show unavailable data as unavailable, and do not calculate or infer missing fees, payouts, currencies, verification states, or historical values.