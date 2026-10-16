---
name: OG Exports investor API contract
description: Verified financial and verification limits in the investor API.
---

Use the Laravel investor-data API as the source of truth for portfolio and account data. Its dashboard provides real portfolio history points derived from investment and profit-distribution records. Withdrawal responses include the requested payout, recorded fee, total wallet debit, status, and reference, and may include a USD conversion/rate. That API has no phone-verification route. Never use sample/demo financial values; follow the scoped Investment Details formula exception below only for that display.

Withdrawals use the investor's existing stored app-wallet currency end to end. The requested payout, fee, total debit, bank payout currency, and wallet reservation must all agree with that currency; do not require USD or relabel a non-USD balance. The minimum payout remains the wallet-currency equivalent of USD 100, and the flat fee remains the wallet-currency equivalent of USD 2, added on top of the payout. Preserve USD conversion snapshots for audit only where the server records them; they do not change the wallet debit currency. The stated processing estimate is “1 to 2 working days.”

**Why:** The user explicitly chose an additional fee rather than deducting it from the payout, so showing a fee without increasing the wallet debit would be misleading.

**How to apply:** Keep the bank payout amount unchanged; validate, reserve, approve, and refund payout plus the fee in the stored wallet currency. Laravel remains authoritative for currency, fee, minimum, balance, and reservation validation. Never use a later live rate to rewrite a submitted fee or request. Mobile must read the currency and balance from the wallet response, show the full available balance in that currency, and show the fee only on the request form. Do not require the currency to be USD.

On mobile, show the full dashboard-reported available wallet balance as the withdrawable balance on the overview. Do not subtract or reveal the withdrawal fee there; show the fee on the request form after the investor proceeds. The fee remains one flat charge per withdrawal, added to the requested payout.

**Why:** The user clarified that withdrawable balance should match the available wallet funds and fee details should appear only after proceeding to the withdrawal form.

**How to apply:** Keep overview balance displays equal to the available balance. On the request form, show the fee once in the synchronized wallet/Profile currency, preserving payout-plus-fee balance validation and total debit preview in that currency.

**Why:** The user requested that mobile investors not see a server-confirmation notice or have Proceed disabled, and that the mobile overview show full available balance with fee details only on the request form. The web portal needs a confirmed wallet fee to show a safe fee-adjusted maximum; Laravel remains financially authoritative.

The minimum bank payout remains equivalent to USD 100, and the USD 2-equivalent withdrawal fee is charged on top, but both amounts are expressed and debited in the stored wallet currency.

**Why:** The minimum applies to the amount sent to the bank, while the fee is a separate wallet debit.

**How to apply:** Return the fee and minimum in the exact stored wallet currency, plus USD equivalents if useful for policy/audit. Enforce the currency-native payout, fee, minimum, and total debit on the server. Never render or submit the numeric wallet balance as a different currency.

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

**How to apply:** Apply this rule at general UI formatting boundaries using Profile currency, except for withdrawal amounts, which use the exact stored app-wallet currency. Do not derive expected profit outside the scoped Investment Details formula above; never derive total return, elapsed days, or stage progress from other data. Keep chart history, opportunities, transactions, payout dates, fees, currencies, and verification states API-only.

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

When reading wallets, use an existing stored `wallet.currency`; for a new or currency-missing investor wallet, use the supported Profile preference and default to USD when it is absent. Country is location only, not an investor wallet currency source. A GET must not change an existing wallet's currency because the balance is not converted.

**Why:** Reassigning currency on a read can make an unchanged numeric balance appear to change value and alter withdrawal terms.

**How to apply:** Keep wallet reads non-mutating for established accounts, and verify dashboard, wallet, and withdrawal responses agree on the stored source currency. Treat any repair of previously relabeled records as a separate, ledger-verified data correction.

For withdrawals, use the existing stored wallet currency and debit the same numeric amount from that wallet. Do not require USD, relabel a numeric balance, mutate wallet currency on GET, or rewrite historical ledger currencies. Keep any USD equivalent as a separate server-recorded audit snapshot, not as the payout or ledger currency.

**Why:** The user changed the withdrawal requirement from USD-only to using the existing app wallet for the complete flow; a separate USD-only gate prevents valid wallet-native withdrawals.

**How to apply:** Keep wallet balance, amount input, fee, minimum, bank payout currency, success details, and total debit in the stored wallet currency. Require server-returned currency-native fee/minimum terms for non-USD wallets. Preserve transaction-password and OTP checks and retain any FX snapshot only as audit metadata.

Profile display preference does not override the wallet currency used for withdrawal. A display preference must not change the stored wallet currency or alter the amount being reserved.

**Why:** The user requires withdrawal to use the existing app wallet throughout, while protecting stored balances from client-side relabeling.

**How to apply:** Use the wallet endpoint's exact source currency for all withdrawal calculations and submission. Do not convert or relabel balances in the client; let Laravel apply and record any separate USD audit conversion.
