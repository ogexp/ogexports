---
name: OG Exports mobile motion performance
description: Project-specific constraints for motion performance and financial trust in the investor app.
---

Keep the OG Exports investor app fast: animations must not delay submission or other user actions. Prefer short, native/UI-thread opacity and transform transitions; avoid continuous decorative motion and artificial financial counters. Exception: the user wants the startup logo orbit to keep rotating throughout the six-second intro; stop it when the intro ends and skip it under reduced-motion accessibility.

**Why:** the user explicitly asked for premium, professional motion without slowing normal app actions, then requested a six-second startup intro with a continuously moving circle.

**How to apply:** keep non-startup interactions fast; limit the continuous loop and six-second hold to the splash intro, use the native driver, and stop the loop on route transition.
