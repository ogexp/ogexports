---
name: OG Exports mobile motion performance
description: Project-specific constraints for motion performance and financial trust in the investor app.
---

Keep the OG Exports investor app fast: animations must not delay submission or other user actions. Prefer short, native/UI-thread opacity and transform transitions; avoid continuous decorative motion and artificial financial counters. Exception: the user wants the startup logo's two orbit rings to rotate throughout the six-second intro, with three evenly spaced dots on each ring; the outer dots should be evenly distributed around the full circle. Stop the loops when the intro ends and skip them under reduced-motion accessibility.

**Why:** the user explicitly asked for premium, professional motion without slowing normal app actions, then requested a six-second startup intro with continuous circle motion, a second outer ring, and three evenly spaced dots on each ring.

**How to apply:** keep non-startup interactions fast; limit the continuous loops and six-second hold to the splash intro, space three dots evenly around both rings, use the native driver, and stop the loops on route transition.

Play a short, elegant confirmation chime when an accepted deposit, withdrawal, or investment response opens its confirmation popup, including received/approved/completed states; keep failed or rejected responses silent. The source asset must be normalized to an audible level, and playback must work in iOS silent mode.

**Why:** the user requested sound whenever a successful transaction confirmation popup appears and reported that a too-quiet asset plus completed-only trigger made the first implementation inaudible.

**How to apply:** trigger audio once per visible popup for accepted response states, never change the server-reported status text, keep errors/rejections silent, configure the native audio session explicitly, and preserve the visual confirmation and haptic if playback fails.
