---
name: OG Exports mobile visual direction
description: The requested premium glass mobile UI with branded teal backgrounds, plus data-safe visual constraints.
---

Keep a calm premium visual language with warm off-white surfaces and muted gold only as a small accent. The user requested that the mobile splash match their supplied dark-teal OG artwork and that mobile brand-green accents use that same teal hue. This mobile change does not authorize restyling the web portal. Use moderate heading sizes and weights; avoid oversized heavy type or making all app surfaces dark. Light is the default appearance; users can choose Light, Dark, or System.

Use premium glass-style cards throughout the mobile app, over soft branded colour-wash backgrounds like the user's supplied pastel-card reference. This supersedes the earlier plain-white card/dock treatment, not the existing content hierarchy or functionality.

**Why:** The user asked to make all app cards glassy and update backgrounds with branded colours for a full premium look.

**How to apply:** Carry the treatment through shared and custom surfaces, authentication and detail screens, while preserving readable balances, distinct financial/status colours, the exact splash-teal primary buttons and smooth native scrolling. Use the existing cross-platform glass fallback constraints rather than requiring unsupported blur.

**Why:** The user supplied a new OG Exports splash reference and explicitly asked to replace the mobile app's green colour with its colour.

**How to apply:** Use the supplied splash artwork and teal brand family throughout mobile controls and highlights. The user specifically asked for button colours to match the splash background exactly: filled primary buttons should use its dark teal in both light and dark appearances, with readable light labels. Retain light surfaces, accessible dark-mode links and distinct financial-status colours.

Use five bottom tabs: Dashboard, Opportunities, Portfolio, Wallet, and Profile. The Home screen uses a full-width brand-teal hero with a bank glyph, greeting, notifications and settings, an Investor account pill, and the centered live available balance. Keep the OG Exports logo/name in the account menu.

The silver-and-green interlocking OG mark shown on the current dark-teal splash is the official OG Exports logo. Use that exact artwork throughout the mobile app, not the older blocky emerald OG mark or the previous sprout mark. Preserve its silver, green and gold details; use transparent artwork on app surfaces. Installed home-screen icons must use the new logo with the same teal gradient background as the splash page.

**Why:** The user explicitly said, “jo logo splash ma ha ab OG Exports ka Official logo yahi ha,” and asked to update the complete mobile app with it.

**How to apply:** Keep mobile screen branding, app icons and locally generated receipt/report branding consistent with the approved splash artwork. This instruction does not authorize changing the web portal.

Keep the mobile splash visible for seven seconds before navigating onward, including when Reduce Motion is enabled; reduced motion should disable animation, not shorten the splash.

**Why:** The user said, “Splash page 7 second rehna chahye phir next page.”

**How to apply:** Enforce the duration independently of animation preferences while still waiting for session initialization before choosing a safe destination.

Use spacious typography, rounded cards with subtle borders and shadows, and light secondary actions with brand-teal borders on mobile. Avoid crypto, gambling, or speculative-return visual cues. Decorative portfolio illustrations must not imply actual performance or introduce financial amounts, forecasts, or other unreported data.

On Home, preserve the supplied screenshot's layout: a full-width brand gradient hero and a floating glass action dock with Deposit Funds, Invest Now, Withdraw Funds, and View Portfolio. Keep the balance API-driven, preserve the privacy toggle, and keep the decorative circles subtle. The main content begins with Account Overview, followed by verification and investment summaries; move Portfolio Performance and Recent Transactions lower.

Keep the Home balance hero and its four-action dock fixed together at the top; only the account overview and the rest of the page below them should scroll.

**Why:** The user explicitly asked for the green card and Deposit/Invest/Withdrawal/View Portfolio card to stay fixed while the remaining Home content scrolls.

**How to apply:** Keep the group in normal safe-area-aware layout outside the lower scroll region, preserve its overlapping dock, privacy and navigation controls, and retain pull-to-refresh and bottom-navigation clearance for the scrollable body.

For Home's My Investments card, limit the admin-status change to its Container Status value. Preserve the existing card layout and Portfolio Performance section; do not change unrelated refresh or dashboard elements.

**Why:** the user explicitly said only the My Investments container status needed updating, and objected to unrelated Home/dashboard changes.

**How to apply:** source the value from the investment/container record and do not substitute a generic trade or project status.

Trade Progress uses a stable color per milestone across the investor app: Funding gold, Investment Confirmed emerald, Cargo Loaded blue, In Transit orange, Custom Clearance deep green, and Settled success green. Unreported stages remain muted; derive color from the stage rather than storing presentation color with admin status data.

**Why:** the user asked that updated milestones retain the distinct colors shown in the supplied trade-progress reference.

**How to apply:** apply the same stage palette to completed and in-progress markers, connectors, and status labels in every Trade Progress variant; keep status and completion sourced from admin/API records.

Country selectors in the investor mobile app should share a polished, searchable country list like the website. Keep free-text market filters distinct from actual country fields.

**Why:** the user asked for a professional country list wherever investors need to select a country.

**How to apply:** route mobile country fields through the reusable selector, preserve the existing country-name string save contract, and do not convert broad “country or market” search fields into selectors.

Keep the full mobile country directory rather than narrowing it to the sibling website’s smaller signup list. Put Pakistan and common export markets first, retain the alphabetical remainder, and keep aliases resolving older saved names.

**Why:** the website is a visual and labeling reference, while existing mobile profile and KYC data can contain country names outside that signup subset.

**How to apply:** when labels are standardized to match the website, keep previous official names and abbreviations searchable so stored values still display as selected.

New investor registrations default to USD for both Profile currency and the actual wallet. Profile currency controls the wallet and every monetary display across the investor app, including investment screens; there is no fixed-USD investment exception.

**Why:** The user clarified that Profile currency must govern the wallet and all displays end-to-end, and new investors should start in USD.

**How to apply:** Persist Profile currency through the authoritative Laravel API and keep the actual wallet denomination, balances, deposit/withdrawal units, and requests synchronized with it. When an existing wallet changes denomination, convert server-side at a recorded rate, preserve historical transaction currencies, and refuse the switch if outstanding financial operations make conversion unsafe. Keep every monetary display—including investment opportunities, positions, portfolio, analytics, and receipts—in the selected currency; never silently relabel an unconverted amount. Preserve Home's privacy toggle and do not add a second currency below its balance.

**Why:** the user asked to match a specific Home-screen reference, including its green hero and five-item bottom navigation. The OG artwork remains the official logo; the new bank glyph is a screen-specific account icon. On 2026-10-06, the user said iOS pages still had too much top gap and twice reported that the Android tab bar remained too high. A later phone screenshot showed a large negative Android offset gets clipped by the system-navigation region; the user chose to stay on Expo Go rather than install a rebuilt app.

**How to apply:** sync mobile theme values to the sibling web palette and keep gold rare. Use the 5 tabs and screenshot-style Home hierarchy with Account Overview directly below the action dock, then verification and investments, followed by Portfolio Performance and Recent Transactions. Preserve existing routes, API data, privacy behavior, and explicit loading/error states. Keep the official logo in the account menu. For iOS non-home screens, let visible native stack headers own the top safe area; for headerless screens, apply the inset once and disable automatic scroll inset adjustment. Preserve notch/status-bar clearance while trimming optional space around page content; do not inflate or double-apply the inset. Keep the Home hero full-bleed with restrained extra spacing after the safe area. On Android, keep the rounded tab pill fully visible above system controls in Expo Go and use only conservative inset-aware lowering; aggressive negative offsets are clipped. Reducing the native system-nav area requires a rebuilt Android app, so do not claim that gap has been removed without one. Preserve the native iOS tab treatment unless asked otherwise.