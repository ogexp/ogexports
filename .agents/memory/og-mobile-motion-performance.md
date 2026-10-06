---
name: OG Exports mobile motion performance
description: Project-specific constraints for motion performance and financial trust in the investor app.
---

Keep the OG Exports investor app fast: animations must not delay navigation, submission, or other user actions. Prefer short, native/UI-thread opacity and transform transitions; avoid continuous decorative motion and artificial financial counters. Respect reduced-motion accessibility and use only backend-confirmed outcomes.

**Why:** the user explicitly asked that animations must not slow the app.

**How to apply:** use these constraints whenever adding or changing motion in the OG Exports mobile app.
