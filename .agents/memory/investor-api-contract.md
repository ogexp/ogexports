---
name: OG Exports investor API contract
description: Verified financial and verification limits in the investor API.
---

Use the Laravel investor-data API as the source of truth for portfolio and account data. Its dashboard provides real portfolio history points derived from investment and profit-distribution records. Withdrawal responses include the requested payout, recorded fee, total wallet debit, status, and reference, and may include a USD conversion/rate. That API has no phone-verification route. Never use sample/demo financial values; follow the scoped Investment Details formula exception below only for that display.

All OG Exports investor wallets and withdrawal requests are USD-denominated, regardless of the investor's country. The minimum bank payout is USD 100, with a flat USD 2 fee added on top. Existing non-USD balances must be safely converted by the server with a recorded rate and audit entry; never relabel their numeric amount as USD. The stated processing estimate is “1 to 2 working days.”

**Why:** The user explicitly chose an additional fee rather than deducting it from the payout, so showing a fee without increasing the wallet debit would be misleading.

**How to apply:** Keep the bank payout amount unchanged; validate, reserve, approve, and refund payout plus the USD fee. Laravel remains authoritative for USD wallet eligibility, conversion, fee, minimum, balance, and reservation validation. Never use a later live rate to rewrite a submitted fee or request. Mobile must show balances and withdrawal terms only after Laravel confirms the wallet is USD; do not convert or relabel PKR amounts in the client.

On mobile, show the full dashboard-reported available USD balance as the withdrawable balance on the overview. Hide legacy non-USD balances until server conversion is complete. Do not subtract or reveal the withdrawal fee on the overview; show it on the request form after the investor proceeds. The fee remains one flat charge per withdrawal, added to the requested payout.

**Why:** The user clarified that withdrawable balance should match the available wallet funds and fee details should appear only after proceeding to the withdrawal form.

**How to apply:** Keep overview balance displays equal to available USD. On the request form, show the USD fee and USD total debit, preserving payout-plus-fee balance validation.

**Why:** The user now requires all investor wallets and withdrawals to be USD; allowing a legacy PKR wallet through would misstate its balance and bypass the conversion requirement.

All new investor wallets must be created in USD even when the investor's profile country is Pakistan. Existing PKR wallets remain unavailable for deposits and withdrawals until safely converted to USD.

**Why:** The minimum applies to the amount sent to the bank, while the fee is a separate wallet debit.

**How to apply:** Make USD the server-side default for every new investor wallet. For legacy non-USD wallets, convert only when the ledger can be reconciled and persist the source/target amounts, rate, and audit reference; keep ambiguous wallets blocked for manual review.

The mobile app's investor data API is the existing Laravel service. The workspace Express API is a separate supplemental service, not a replacement source for Laravel investor project or investment responses. When Laravel implementation code is outside this workspace, define and generate the contract here, but keep the external server implementation boundary explicit; do not store parallel local shipment data that investors cannot receive.

Monthly wallet statements should reconcile against available plus pending wallet balances and completed wallet-ledger movements. Pending reservations are not posted cash outflows. Laravel records completed investment returns as one credit containing both principal and profit; split principal returned from distributions only when wallet-currency metadata reconciles to that credit. Otherwise show the full amount as an other wallet movement, not as a distribution.

Pre-payment payout progress such as scheduled or processing status and a planned date is administrative metadata, not a distribution or wallet movement. Only a confirmed distribution record with `distributed_at` may be shown as Distributed.

**Why:** Recording planned payouts as distributions would make an unpaid status look financially completed and could affect totals or wallet reporting.

**How to apply:** Keep pre-payment progress separate from confirmed profit-distribution records. Do not create ledger credits or count completed returns when an admin sets or changes a planned payout state.

**Why:** The OG Exports master prompt requires the backend to be the financial source of truth and explicitly forbids hard-coded financial values.

**Why:** The user confirmed that the existing Laravel API remains authoritative for this product; a second local store would be disconnected from the data the investor app reads.

**Why:** A pending wallet reservation only moves funds between available and pending balances. Investment completion credits principal and profit together, so counting the full credit as a distribution would overstate earnings.

**How to apply:** Use API fields as supplied, including zero. For absent money, follow the display-only placeholder rule below; keep API fetch errors explicit. Investment Details is a scoped exception: the user requested expected profit from invested amount × reported ROI percentage / 100. Use that formula only when both inputs are present, prefer an explicit server value only when the inputs needed for the formula are absent, and never persist the display calculation. Do not derive total return by adding profit to principal, elapsed days from the local clock, or stage progress from ETA/trade status; these must be explicit API/admin values. Keep chart history, opportunities, transactions, payout dates/amounts, fees, currencies, and verification states API-only. For wallet statements, count completed posted events, keep pending reservations out of cash-flow totals, and do not label combined investment-return credits as distributions unless their ledger metadata supports a reconciled split. Add fields and admin operations to the Laravel OpenAPI contract when its implementation repository is unavailable, and state when that server-side work remains external.

For display only, render an absent monetary field as zero in Profile's selected currency; do not calculate a substitute from other fields or persist the placeholder as financial data. Keep absent non-monetary text neutral or omitted, and keep API fetch failures as explicit error/unavailable states.

**Why:** The user requires a visible display-only zero for missing money while keeping Laravel as the sole financial source; all monetary displays follow Profile currency.

**How to apply:** Apply this rule at general UI formatting boundaries using Profile currency, except withdrawal/account eligibility, which requires the server-confirmed USD wallet. Do not derive expected profit outside the scoped Investment Details formula above; never derive total return, elapsed days, or stage progress from other data. Keep chart history, opportunities, transactions, payout dates, fees, currencies, and verification states API-only.

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

Portfolio Total Value is a current-holdings figure and must never be lower than the same-currency available wallet balance. It includes open (pending/active) investment principal, available and reserved wallet balances, and explicit pending distribution credits. Do not add confirmed distributions again when they are already reflected in the wallet. On mobile, preserve the server total when it is higher; if it is lower than the same-currency available balance, display at least the available balance. Never compare mixed currencies.

**Why:** The user confirmed that Total Portfolio Value must include available funds and chose a current total that avoids counting paid-out returns twice.

**How to apply:** Use dashboard-sourced values and their currency metadata. Reconcile only same-currency figures, keep confirmed returns separate when already in the wallet, and cover the available-balance floor with a regression test.

For available-balance consistency requests, inspect both the investor mobile app and web portal. Use the dashboard's `summary.available_balance`, then its `wallet.available_balance` fallback, for investor-facing available-balance displays; do not fall back to the separate wallet endpoint's available-balance field when it disagrees. Keep investment and withdrawal enforcement server-side.

**Why:** A mobile-only balance correction did not resolve the user's web preview, which still showed a different wallet-endpoint amount.

**How to apply:** Search both `artifacts/mobile` and `artifacts/og-container-admin` for available-balance consumers, preserve pending/breakdown data from their existing endpoints, and verify each surface against the dashboard response.

When reading wallets, keep an existing stored `wallet.currency` unchanged until a separately audited conversion is performed. Every new investor wallet must be USD, regardless of country or Profile display preference. A GET must not change an existing wallet's currency because the balance is not converted.

**Why:** Reassigning currency on a read can make an unchanged numeric balance appear to change value and alter withdrawal terms.

**How to apply:** Keep wallet reads non-mutating for established accounts, and verify dashboard, wallet, and withdrawal responses agree on the stored source currency. Treat any repair of previously relabeled records as a separate, ledger-verified data correction.

All newly registered investor wallets must be USD. Existing PKR wallets require an audited server-side conversion before they can be used for wallet actions; a GET must never change currency or reinterpret the existing numeric balance.

**Why:** The user confirmed OG Exports investor accounts are USD-only, so Pakistan country/profile data must not cause new wallets or withdrawals to use PKR.

**How to apply:** Keep wallet balance, deposit, withdrawal amount, fee, minimum, bank payout currency, success details, and total debit in USD. Block wallet actions for legacy non-USD accounts until the Laravel service safely converts them and returns USD.

Profile country and display preference must not make an investor's account or wallet non-USD.

**Why:** The user explicitly stated that every OG Exports investor account must be USD-only.

**How to apply:** Use USD-only financial records and requests. Do not convert or relabel balances in the client; Laravel must perform and audit any conversion of legacy non-USD wallets.
