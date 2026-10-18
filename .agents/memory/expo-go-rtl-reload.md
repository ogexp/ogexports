---
name: Expo Go RTL reload behavior
description: Avoid repeated Expo Go project restarts when account language preferences enable RTL.
---

Do not call `reloadAppAsync()` from a language-direction effect while running inside Expo Go. `I18nManager.forceRTL()` can request an app reload; in Expo Go that reload can reopen the development project during authenticated startup. Keep the preference and let the user reload Expo Go manually if the native direction has not applied.

**Why:** An investor login followed by loading Urdu/Arabic profile preferences can trigger the direction effect, repeatedly restarting the Expo Go preview before the signed-in screen appears.

**How to apply:** When changing mobile RTL handling, use `isRunningInExpoGo()` to avoid automatic Expo Go restarts. Preserve deliberate direction application for installed builds and verify authenticated startup with RTL preferences.
