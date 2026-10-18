---
name: Android AAB build approval
description: The user must explicitly request an Android App Bundle build before one is started.
---

Never start or rebuild an Android AAB unless the user explicitly asks for that build.

**Why:** Android release builds are costly and create a Play Store artifact; the user wants to control when they happen.

**How to apply:** Code or Expo configuration changes do not imply permission to build an AAB. Ask only if a build is the clear next step, and wait for the user's explicit approval.
