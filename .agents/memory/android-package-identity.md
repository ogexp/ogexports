---
name: Android package identity
description: Keep Expo, Gradle, and generated React Native package references aligned after Android application ID changes.
---

When changing the Android application ID, update the Expo config, Gradle namespace/applicationId, Kotlin package declarations, and source package directory together. Regenerate React Native autolinking metadata before building; cached autolinking JSON can retain the prior package and produce an entry point that references the wrong `BuildConfig`.

**Why:** A stale generated package reference caused Java compilation to fail even though Expo and Gradle already had the new ID. The user chose `com.ogexports.investor` as a separate Play Console listing, not as a replacement for the existing `com.ogexports.invest` listing.

**How to apply:** Before a release build after an ID change, compare Expo's resolved Android package with Gradle's namespace/applicationId and the generated autolinking package/entry point. If the entry point stays stale after rerunning Gradle tasks, invalidate the cached autolinking config and its dependency-hash marker first; that cache may not track app identity changes. A different package creates a distinct Play app; do not describe it as an update to the old listing.
