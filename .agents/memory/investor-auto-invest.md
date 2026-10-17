---
name: Investor auto-invest timing
description: Scope and activation timing for investor-configured automatic investment rules.
---

Auto-invest rules must never backfill opportunities already open when the investor enables a rule; they apply only to later opportunities that enter funding.

**Why:** The investor chose to apply auto-invest only to opportunities that arrive after activation, avoiding unexpected wallet debits from existing listings.

**How to apply:** Saving or enabling a rule must not scan current funding projects. Only a newly created opportunity or a later transition into funding may trigger a matching rule.

Investor-facing commodity choices must come only from products currently approved for public display on the website. Selecting one product and entering an amount should save and activate the rule in one action; it matches that commodity across container sizes. Stop matching if the product is no longer publicly approved.

**Why:** The user specified on 17 October 2026 that investors must select only names admins published publicly and wanted a one-tap save flow without container-type selection.

**How to apply:** Read options from the same approved product catalog used by the public website, validate approval again when saving and processing, and treat the container type as unrestricted for these rules.
