---
name: OG Exports mobile motion performance
description: Project-specific constraints for motion performance and financial trust in the investor app.
---

Keep the OG Exports investor app fast: animations must not delay submission or other user actions. Prefer short, native/UI-thread opacity and transform transitions; avoid continuous decorative motion and artificial financial counters. The mobile startup visual now follows the user's supplied dark-teal OG splash, with a restrained logo/text entrance and lower progress treatment rather than the older rotating orbit rings. Preserve existing startup timing and routing unless the user requests a timing change, and retain reduced-motion skipping.

**Why:** the user wants professional motion without slowing normal app actions, and later replaced the old orbit-ring splash direction with a supplied dark-teal splash reference.

**How to apply:** keep non-startup interactions fast; do not reintroduce the superseded orbit rings or add new startup delays. Keep splash transitions lightweight and stop animations on route transition.

Play a short, elegant confirmation chime when an accepted deposit, withdrawal, or investment response opens its confirmation popup, including received/approved/completed states; keep failed or rejected responses silent. The source asset must be normalized to an audible level. Play through iOS silent mode, but respect Android silent/vibrate ringer modes and media volume.

**Why:** the user requested sound whenever a successful transaction confirmation popup appears and reported that a too-quiet asset plus completed-only trigger made the first implementation inaudible. The requested platform-settings behavior is to honor iOS silent-mode playback while not overriding Android ringer settings.

**How to apply:** trigger audio once per visible popup for accepted response states, never change the server-reported status text, keep errors/rejections silent, configure the native audio session explicitly (`playsInSilentMode` on for iOS and off for Android; mix with other audio), and preserve the visual confirmation and haptic if playback fails.
