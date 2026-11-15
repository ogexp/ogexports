---
name: Android upload signing identity
description: Known mismatch between OG Exports 50's existing EAS Android signer and the Play upload certificate.
---

The user confirmed that the SHA-256 fingerprint from OG Exports 50's historical EAS AAB does not match the upload certificate shown in Google Play Console.

**Why:** An AAB signed with a different key cannot update the existing Play app. Expo signs Android builds with the keystore currently associated with the EAS project.

**How to apply:** Do not run or deliver an OG Exports 50 production AAB until the original Play upload keystore is restored to that project's EAS credentials and the resulting signer is confirmed. Never generate a replacement key or request a keystore password/private key in chat. Keep auto-submit disabled unless the user separately asks to submit.
