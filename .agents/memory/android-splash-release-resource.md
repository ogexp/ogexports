---
name: Android splash release resource
description: EAS-generated Android release builds need the Expo splash plugin to emit the drawable referenced by the native splash theme.
---

Set an existing image on the `expo-splash-screen` config plugin. With no checked-in Android native project, EAS generates the Android project during the release build; the generated splash theme can reference `@drawable/splashscreen_logo`, and resource linking fails if the plugin does not generate it.

**Why:** An OG Exports Android production build failed at `:app:processReleaseResources` because `drawable/splashscreen_logo` was missing.

**How to apply:** Keep the plugin's `image` pointed at a real mobile asset and verify the resolved Expo config before triggering an Android release build.
