---
name: Investor auto-invest timing
description: Scope and activation timing for investor-configured automatic investment rules.
---

Auto-invest rules must never backfill opportunities already open when the investor enables a rule; they apply only to later opportunities that enter funding.

**Why:** The investor chose to apply auto-invest only to opportunities that arrive after activation, avoiding unexpected wallet debits from existing listings.

**How to apply:** Saving or enabling a rule must not scan current funding projects. Only a newly created opportunity or a later transition into funding may trigger a matching rule.

Investor-facing Auto-invest choices come from a dedicated administrator-managed mobile catalog, initialized with Rice, Corn (Maize), Potatoes, and Sesame seeds. Its enabled state is the approval gate for choosing, saving, and processing a rule; disabling or removing an entry stops future matches. This catalog is independent of the public website product list because the mobile options are broad commodities.

**Why:** The user asked admins to control which broad commodities appear in mobile Auto-invest, including entries that do not exactly match public product titles, while keeping activation explicit.

**How to apply:** Read enabled options from the mobile Auto-invest catalog, save only when the user taps the enable button, validate catalog membership again when saving and processing, and treat the container type as unrestricted for these rules.
