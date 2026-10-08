---
name: OG Exports mobile motion performance
description: Project-specific constraints for motion performance and financial trust in the investor app.
---

Keep the OG Exports investor app fast: animations must not delay submission or other user actions. Prefer short, native/UI-thread opacity and transform transitions; avoid continuous decorative motion and artificial financial counters. Exception: the user wants the startup logo's two orbit rings to rotate throughout the six-second intro, with three evenly spaced dots on each ring and the outer ring's dots on the left; stop them when the intro ends and skip them under reduced-motion accessibility.

**Why:** the user explicitly asked for premium, professional motion without slowing normal app actions, then requested a six-second startup intro with continuous circle motion, a second outer ring, and three dots on each.

**How to apply:** keep non-startup interactions fast; limit the continuous loops and six-second hold to the splash intro, space three dots evenly on each ring, keep the outer-ring dots on the left, use the native driver, and stop the loops on route transition.
