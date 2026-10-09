---
name: OG Exports mobile motion performance
description: Project-specific constraints for motion performance and financial trust in the investor app.
---

Keep the OG Exports investor app fast: animations must not delay submission or other user actions. Prefer short, native/UI-thread opacity and transform transitions; avoid continuous decorative motion and artificial financial counters. Exception: the user wants the startup logo's two orbit rings to rotate throughout the six-second intro, with three evenly spaced dots on each ring; the outer dots should be evenly distributed around the full circle. Stop the loops when the intro ends and skip them under reduced-motion accessibility.

**Why:** the user explicitly asked for premium, professional motion without slowing normal app actions, then requested a six-second startup intro with continuous circle motion, a second outer ring, and three evenly spaced dots on each ring.

**How to apply:** keep non-startup interactions fast; limit the continuous loops and six-second hold to the splash intro, space three dots evenly around both rings, use the native driver, and stop the loops on route transition.

Play a short, elegant transaction-complete chime with the success popup only when OG Exports reports a deposit credited/completed, a withdrawal transferred/paid/completed, or an investment confirmed/completed. Do not play it for submitted, pending, approved-only, failed, or rejected states.

**Why:** the user requested a premium notification sound after deposit, withdrawal, and trade investment completion, while financial status wording must continue to distinguish approval from completion.

**How to apply:** tie audio to the popup's confirmed-success feedback state, play once per popup opening, and keep the visual confirmation and haptic working if device audio is unavailable.
