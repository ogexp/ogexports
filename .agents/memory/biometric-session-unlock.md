---
name: Biometric session unlock
description: Security constraints for Face ID, Touch ID, and fingerprint unlock in the OG Exports mobile app.
---

Biometrics verify the device owner locally and unlock the existing securely stored account session. Never store the account password or let biometrics create a server session when no valid saved token exists. Keep biometric opt-in scoped to the account and preserve a usable app PIN/password fallback, including while the app is locked.

**Why:** The user asked for working, professional biometric sign-in while existing email/password and optional email 2FA remain the source of fresh authentication.

**How to apply:** When changing mobile authentication, treat biometrics as a local unlock for a saved session; keep password and email verification for fresh sign-in, and verify the locked-session fallback route remains reachable.