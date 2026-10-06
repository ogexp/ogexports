---
name: OG Exports mobile visual direction
description: The requested premium light brand style and data-safe visual constraints for the investor app.
---

Across OG Exports web and mobile, keep a calm premium visual language: warm off-white surfaces, clear emerald hierarchy, soft green highlights, and muted gold only as a small accent. Use moderate heading sizes and weights; avoid oversized heavy type, black-heavy surfaces, strong glows, and metallic shimmer. Light is the default appearance; users can choose Light, Dark, or System.

Use five bottom tabs: Dashboard, Opportunities, Portfolio, Wallet, and Profile. The Home screen uses a full-width emerald hero with a bank glyph, greeting, notifications and settings, an Investor account pill, and the centered live available balance. Keep the OG Exports logo/name in the account menu.

The metallic emerald “OG” artwork supplied by the user is the official logo. Use that artwork for app identity instead of the previous sprout mark, with a transparent background and its original emerald colors.

Use spacious typography, rounded cards with subtle borders and shadows, and light secondary actions with emerald borders. Avoid crypto, gambling, or speculative-return visual cues. Decorative portfolio illustrations must not imply actual performance or introduce financial amounts, forecasts, or other unreported data.

On Home, use the supplied screenshot direction: a full-width emerald gradient hero and a white floating action dock with Deposit Funds, Invest Now, Withdraw Funds, and View Portfolio. Keep the balance API-driven, preserve the privacy toggle, and keep the decorative circles subtle. The white content begins with Account Overview, followed by verification and investment summaries; move Portfolio Performance and Recent Transactions lower.

Home's prominent available balance must be formatted in the API wallet's local currency, regardless of the app's optional display-currency preference. Do not show a duplicate local-equivalent line when the primary balance is already local.

**Why:** The user asked for the green-card balance to show in local wallet currency rather than `$`; showing both the same local amount twice is redundant.

**How to apply:** Convert from the API-reported dashboard balance currency to the wallet currency using valid API FX data, then format explicitly in that wallet currency. If conversion is unavailable, show the amount with its source currency rather than mislabeling it.

**Why:** the user asked to match a specific Home-screen reference, including its green hero and five-item bottom navigation. The OG artwork remains the official logo; the new bank glyph is a screen-specific account icon. On 2026-10-06, the user said iOS pages still had too much top gap and twice reported that the Android tab bar remained too high. A later phone screenshot showed a large negative Android offset gets clipped by the system-navigation region; the user chose to stay on Expo Go rather than install a rebuilt app.

**How to apply:** sync mobile theme values to the sibling web palette and keep gold rare. Use the 5 tabs and screenshot-style Home hierarchy with Account Overview directly below the action dock, then verification and investments, followed by Portfolio Performance and Recent Transactions. Preserve existing routes, API data, privacy behavior, and explicit loading/error states. Keep the official logo in the account menu. For iOS non-home screens, let visible native stack headers own the top safe area; for headerless screens, apply the inset once and disable automatic scroll inset adjustment. Preserve notch/status-bar clearance while trimming optional space around page content; do not inflate or double-apply the inset. Keep the Home hero full-bleed with restrained extra spacing after the safe area. On Android, keep the rounded tab pill fully visible above system controls in Expo Go and use only conservative inset-aware lowering; aggressive negative offsets are clipped. Reducing the native system-nav area requires a rebuilt Android app, so do not claim that gap has been removed without one. Preserve the native iOS tab treatment unless asked otherwise.