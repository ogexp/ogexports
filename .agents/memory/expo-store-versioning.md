---
name: Expo store versioning
description: How to set the store-facing version for OG Exports Expo builds.
---

Set the user-facing store release version in the shared top-level `expo.version`; do not rely on `ios.version` to make an iOS-only store version. Keep iOS `buildNumber` and Android `versionCode` as their separate platform build identifiers.

**Why:** EAS reported the shared version instead of the nested iOS version during a production iOS build, which could have produced an IPA with the wrong App Store version.

**How to apply:** Before building for either store, set and verify `expo.version` matches the intended user-facing release. Remember this also changes Android's user-facing version; check its `versionCode` separately before a Play release.
