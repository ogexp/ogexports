---
name: Investor auto-invest timing
description: Scope and activation timing for investor-configured automatic investment rules.
---

Auto-invest rules must never backfill opportunities already open when the investor enables a rule; they apply only to later opportunities that enter funding.

**Why:** The investor chose to apply auto-invest only to opportunities that arrive after activation, avoiding unexpected wallet debits from existing listings.

**How to apply:** Saving or enabling a rule must not scan current funding projects. Only a newly created opportunity or a later transition into funding may trigger a matching rule.
