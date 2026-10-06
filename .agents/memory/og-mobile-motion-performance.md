---
name: OG Exports mobile motion performance
description: Project-specific constraints for motion performance and financial trust in the investor app.
---

Keep the OG Exports investor app fast: animations must not delay navigation, submission, or other user actions. The user also wants a polished, luxury-feeling motion experience throughout the investor journey, including startup, onboarding, wallet/investment confirmations, and support. Prefer short, native/UI-thread opacity and transform transitions; avoid continuous decorative motion and artificial financial counters. Respect reduced-motion accessibility and use only backend-confirmed outcomes.

**Why:** the user explicitly asked for premium, professional motion throughout the app without slowing it down.

**How to apply:** use these constraints whenever adding or changing motion in the OG Exports mobile app, especially its startup/onboarding and transaction/support feedback.
