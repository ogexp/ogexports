---
name: OG Exports mobile motion performance
description: Project-specific constraints for motion performance and financial trust in the investor app.
---

Keep the OG Exports investor app fast: animations must not delay submission or other user actions. Prefer native/UI-thread opacity and transform transitions and never use artificial financial counters. The user explicitly requested professional animations for the existing branded background colours and further glass-card polish: slow ambient background motion is allowed, but not continuous animation on every card. The mobile startup visual follows the user's supplied dark-teal OG splash, with a restrained logo/text entrance and lower progress treatment rather than the older rotating orbit rings. Preserve existing startup timing and routing unless the user requests a timing change, and retain reduced-motion skipping.

**Why:** the user wants professional motion without slowing normal app actions, explicitly asked for animated branded backgrounds and polished glass cards, and replaced the old orbit-ring splash direction with a supplied dark-teal splash reference.

**How to apply:** keep interactions fast; do not reintroduce the superseded orbit rings or add new startup delays. Pause ambient motion on unfocused screens and backgrounded/hidden apps, keep unknown or reduced-motion preferences static, and never hold interaction handles that delay list rendering. Keep splash transitions lightweight and stop animations on route transition.

On Home, uninterrupted scrolling takes priority over per-card decorative animation. Retain the premium static glass finish and restrained background motion rather than animating every feed card.

**Why:** The user reported that Home scrolling stalled after the glass/background work and explicitly requested fast, smooth scrolling.

**How to apply:** Keep decorative paint bounded by the viewport even when its background belongs to long scrolling content. Avoid timer churn or page-wide state updates from scroll events, and do not show/hide navigation merely because a new drag starts; preserve actual tap, reverse-scroll and idle reveal behavior.

Home and Wallet green balance cards should have only a subtle frosted-glass treatment, at most approximately 10% strength, with no shine or reflective band.

**Why:** The user requested a low-strength glass finish, then explicitly corrected the result: “shine ko remove kro, just glassy bnao.”

**How to apply:** Preserve the opaque branded green and readable balances; use a quiet uniform frosted tint and corner-matched outline. Do not reintroduce reflective streaks, shine gradients, stronger blur or animations that undo the Home scrolling improvements.

Play a short, elegant confirmation chime when an accepted deposit, withdrawal, or investment response opens its confirmation popup, including received/approved/completed states; keep failed or rejected responses silent. The source asset must be normalized to an audible level. Play through iOS silent mode, but respect Android silent/vibrate ringer modes and media volume.

**Why:** the user requested sound whenever a successful transaction confirmation popup appears and reported that a too-quiet asset plus completed-only trigger made the first implementation inaudible. The requested platform-settings behavior is to honor iOS silent-mode playback while not overriding Android ringer settings.

**How to apply:** trigger audio once per visible popup for accepted response states, never change the server-reported status text, keep errors/rejections silent, configure the native audio session explicitly (`playsInSilentMode` on for iOS and off for Android; mix with other audio), and preserve the visual confirmation and haptic if playback fails.
