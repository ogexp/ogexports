---
name: Expo DevTools runtime warning
description: Distinguishes an optional React Native DevTools binary failure from an unavailable Expo app.
---

The React Native DevTools binary may report that `libglib-2.0.so.0` is missing when Expo starts in this environment, even while Metro starts, bundles the app, and serves the preview. Treat this as a debugger-only failure when the app itself remains available; do not change app code or add system packages just to silence it.

**Why:** Expo logged the missing shared library during a restart, but the app bundle and sign-in preview loaded successfully.

**How to apply:** Verify Metro bundling and the app preview separately from the optional debugger installation message. Report the warning as non-blocking unless the app itself fails.