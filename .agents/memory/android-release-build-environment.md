---
name: Android release build environment
description: Replit Nix Android SDK and JDK considerations for local Gradle release builds.
---

The Android SDK supplied through the Nix store is read-only, and Gradle may request SDK components not already present. Use a temporary writable SDK root, reusing the installed Nix components through links and installing only missing components there. This workspace's default GraalVM Java 19 failed Android's `jlink` system-module transform; Java 17 succeeded past that step. Expo SDK 57 can report Build Tools 36.0.0 at the root while its `:expo` project still requests 35.0.0; a command-line `android.buildToolsVersion` property did not override that project.

**Why:** A release build could not install a required Build Tools package in the immutable Nix SDK, and the default Java 19 runtime failed during Android SDK image transformation. Installing or accepting another SDK package is unnecessary when the project already has a compatible configured Build Tools version.

**How to apply:** Before a local Gradle release build, point `ANDROID_HOME` and `ANDROID_SDK_ROOT` at a writable temporary SDK root and use Java 17; preserve the app's configured SDK/NDK versions. If Expo SDK 57's `:expo` project requests missing Build Tools 35 while the root is configured for 36, apply the root's configured build-tools version to Android library/application subprojects in the temporary native build config rather than changing the app SDK or signing key.
