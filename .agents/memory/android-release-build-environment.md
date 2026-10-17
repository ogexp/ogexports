---
name: Android release build environment
description: Replit Nix Android SDK and JDK considerations for local Gradle release builds.
---

The Android SDK supplied through the Nix store is read-only, and Gradle may request SDK components not already present. Use a temporary writable SDK root, reusing the installed Nix components through links and installing only missing components there. This workspace's default GraalVM Java 19 failed Android's `jlink` system-module transform; Java 17 succeeded past that step.

**Why:** A release build could not install a required Build Tools package in the immutable Nix SDK, and the default Java 19 runtime failed during Android SDK image transformation.

**How to apply:** Before a local Gradle release build, point `ANDROID_HOME` and `ANDROID_SDK_ROOT` at a writable temporary SDK root and use Java 17; preserve the app's configured SDK/NDK versions.
