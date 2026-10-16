---
name: Mobile popup glass treatment
description: Cross-platform constraints for frosted popup surfaces in the investor app.
---

Use a shared translucent, bordered popup surface for app-owned mobile modals and sheets. On iOS and web, `expo-blur` can provide the background blur; on Android, prefer a polished tinted translucent fallback unless a valid `BlurTargetView` can be supplied within the same native window.

**Why:** Expo BlurView's Android blur method requires a `blurTarget`; using the deprecated experimental prop without one silently falls back to no blur and emits warnings. A `Modal` may not expose the underlying app view as a blur target.

**How to apply:** Keep dialogs legible without blur, honor the active light/dark palette, and avoid configuring Android's Dimezis blur method until its target is correctly wired.
