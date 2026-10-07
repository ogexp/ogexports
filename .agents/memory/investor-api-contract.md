---
name: OG Exports investor API contract
description: Verified financial and verification limits in the investor API.
---

Use the Laravel investor-data API as the source of truth for portfolio and account data. Its dashboard provides real portfolio history points derived from investment and profit-distribution records. Withdrawal responses include the requested payout, recorded fee, total wallet debit, status, and reference, and may include a USD conversion/rate. That API has no phone-verification route. Never use sample/demo financial values; follow the scoped Investment Details formula exception below only for that display.

The user-confirmed withdrawal policy is a USD 2 fee added on top of the bank payout: a USD 100 payout reserves/debits USD 102. For PKR wallets, convert the fee with the withdrawal's stored PKR-per-USD exchange-rate snapshot, and return the full reserved debit when the request is rejected. The stated processing estimate is “1 to 2 working days.”

**Why:** The user explicitly chose an additional fee rather than deducting it from the payout, so showing a fee without increasing the wallet debit would be misleading.

**How to apply:** Keep the bank payout amount unchanged; validate, reserve, approve, and refund payout plus fee. Display the server-returned fee in USD and its wallet-currency equivalent when applicable. Do not use a later live rate to rewrite a submitted PKR fee. If the API omits terms, the mobile app may show the USD 2 fee and processing estimate as reference, but must not show a server-confirmation warning or disable Proceed. Do not invent non-USD fee/minimum conversions on the client; send requests to Laravel, which remains authoritative for fee, minimum, balance, and reservation validation.

**Why:** The user requested that investors not see the server-confirmation notice and that Proceed remain active; Laravel still determines whether a withdrawal request is valid.

The minimum bank payout is USD 100, with the USD 2 withdrawal fee charged on top. PKR payouts must meet the USD 100 equivalent using the exchange-rate snapshot used for that withdrawal.

**Why:** The minimum applies to the amount sent to the bank, while the fee is a separate wallet debit.

**How to apply:** Return the USD minimum and its wallet-currency equivalent from the API. Enforce the USD threshold on the server using the request's currency snapshot; use the API-converted wallet amount for mobile validation and display.

The mobile app's investor data API is the existing Laravel service. The workspace Express API is a separate supplemental service, not a replacement source for Laravel investor project or investment responses. When Laravel implementation code is outside this workspace, define and generate the contract here, but keep the external server implementation boundary explicit; do not store parallel local shipment data that investors cannot receive.

Monthly wallet statements should reconcile against available plus pending wallet balances and completed wallet-ledger movements. Pending reservations are not posted cash outflows. Laravel records completed investment returns as one credit containing both principal and profit; split principal returned from distributions only when wallet-currency metadata reconciles to that credit. Otherwise show the full amount as an other wallet movement, not as a distribution.

Pre-payment payout progress such as scheduled or processing status and a planned date is administrative metadata, not a distribution or wallet movement. Only a confirmed distribution record with `distributed_at` may be shown as Distributed.

**Why:** Recording planned payouts as distributions would make an unpaid status look financially completed and could affect totals or wallet reporting.

**How to apply:** Keep pre-payment progress separate from confirmed profit-distribution records. Do not create ledger credits or count completed returns when an admin sets or changes a planned payout state.

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

The investor production Laravel API is hosted at `https://api.ogexports.co`; `ogexports.co` serves the public portal and returns SPA HTML for unknown `/api/...` paths. The live `/api/uploads` route requires authentication, so an unauthenticated 401 confirms reachability but not upload-size rules.

**Why:** On October 6, 2026, probing the public site host returned misleading HTML, while the API subdomain returned Laravel JSON. The protected upload endpoint could not expose its size rule without an authorized session.

**How to apply:** Use `api.ogexports.co` for live investor API checks. Verify protected upload limits with authorized test uploads after deployment; do not infer acceptance from the health endpoint or an unauthenticated route response.

The supplied Laravel source snapshot limits image uploads to 8 MB and permits PDF uploads up to 20 MB, while the investor mobile flow applies a 10 MB client-side limit.

**Why:** A mobile file can pass the 10 MB check and still be rejected by the Laravel upload endpoint when it is an image above 8 MB.

**How to apply:** Confirm the deployed Laravel limits before claiming the full mobile 10 MB range works; coordinate a server-side limit change rather than silently lowering the mobile limit requested for this app.

For available-balance consistency requests, inspect both the investor mobile app and web portal. Use the dashboard's `summary.available_balance`, then its `wallet.available_balance` fallback, for investor-facing available-balance displays; do not fall back to the separate wallet endpoint's available-balance field when it disagrees. Keep investment and withdrawal enforcement server-side.

**Why:** A mobile-only balance correction did not resolve the user's web preview, which still showed a different wallet-endpoint amount.

**How to apply:** Search both `artifacts/mobile` and `artifacts/og-container-admin` for available-balance consumers, preserve pending/breakdown data from their existing endpoints, and verify each surface against the dashboard response.
