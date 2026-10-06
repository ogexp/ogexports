---
name: OG Exports investor API contract
description: Verified financial and verification limits in the investor API.
---

Use the Laravel investor-data API as the source of truth for portfolio and account data. Its dashboard provides real portfolio history points derived from investment and profit-distribution records. The withdrawal response includes status, reference, and amount, and may include USD conversion/rate, but it does not provide fee or net-payout fields. That API has no phone-verification route. Never use sample/demo financial values; follow the scoped Investment Details formula exception below only for that display.

The mobile app's investor data API is the existing Laravel service. The workspace Express API is a separate supplemental service, not a replacement source for Laravel investor project or investment responses. When Laravel implementation code is outside this workspace, define and generate the contract here, but keep the external server implementation boundary explicit; do not store parallel local shipment data that investors cannot receive.

Monthly wallet statements should reconcile against available plus pending wallet balances and completed wallet-ledger movements. Pending reservations are not posted cash outflows. Laravel records completed investment returns as one credit containing both principal and profit; split principal returned from distributions only when wallet-currency metadata reconciles to that credit. Otherwise show the full amount as an other wallet movement, not as a distribution.

**Why:** The OG Exports master prompt requires the backend to be the financial source of truth and explicitly forbids hard-coded financial values.

**Why:** The user confirmed that the existing Laravel API remains authoritative for this product; a second local store would be disconnected from the data the investor app reads.

**Why:** A pending wallet reservation only moves funds between available and pending balances. Investment completion credits principal and profit together, so counting the full credit as a distribution would overstate earnings.

**How to apply:** Use API fields as supplied, including zero. For absent money, follow the display-only `0.00 USD` rule below; keep API fetch errors explicit. Investment Details is a scoped exception: the user requested expected profit from invested amount × reported ROI percentage / 100. Use that formula only when both inputs are present, prefer an explicit server value only when the inputs needed for the formula are absent, and never persist the display calculation. Do not derive total return by adding profit to principal, elapsed days from the local clock, or stage progress from ETA/trade status; these must be explicit API/admin values. Keep chart history, opportunities, transactions, payout dates/amounts, fees, currencies, and verification states API-only. For wallet statements, count completed posted events, keep pending reservations out of cash-flow totals, and do not label combined investment-return credits as distributions unless their ledger metadata supports a reconciled split. Add fields and admin operations to the Laravel OpenAPI contract when its implementation repository is unavailable, and state when that server-side work remains external.

For display only, render an absent monetary field as `0.00 USD`; do not calculate a substitute from other fields or persist the placeholder as financial data. Keep absent non-monetary text neutral or omitted, and keep API fetch failures as explicit error/unavailable states.

**Why:** The investor-facing requirement is to show `0.00 USD` for missing money while keeping Laravel as the sole financial source.

**How to apply:** Apply this rule at UI formatting boundaries only. Do not derive expected profit outside the scoped Investment Details formula above; never derive total return, elapsed days, or stage progress from other data. Keep chart history, opportunities, transactions, payout dates, fees, currencies, and verification states API-only.

Before treating the Laravel implementation as unavailable, inspect `attached_assets` for source archives. If provided, extract the backend into a dedicated project directory without unpacking `.env` files, logs, or uploaded user data.

**Why:** the Laravel source had already been supplied as an archive, but a root-only search missed it and led to an unnecessary request for the same source.

**How to apply:** When PHP source is absent from the workspace root, check attached ZIP archives before asking the user to provide the backend again; never inspect uploaded `.env` contents.

For the OG Exports web portal, development API requests use a Vite proxy under the artifact base path and forward the allowlisted `https://ogexports.co` origin; production calls the Laravel API directly. Verify each feature route on the live API independently of `/api/health`: on October 4, 2026, health returned successfully while the bank-review collection route returned 404 even though its route/controller were present in the workspace Laravel source.

**Why:** A healthy API and a route in local source do not prove that production has deployed that route, and the Replit preview origin is not itself allowlisted by the live API.

**How to apply:** Check the exact live endpoint and hosting origin before declaring a Laravel-backed portal feature operational. Keep an explicit error state instead of substituting mock/local data; coordinate the backend deployment or CORS/Sanctum allowlist when needed.