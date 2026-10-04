---
name: Investor email authentication and profile rollout
description: Product rules for investor email codes, email-only sign-in, and optional phone profile details.
---

Use email verification codes during registration, email codes for password recovery, and email-based 2FA when enabled. Password sign-in is email-only.

Mobile number and country are optional profile details collected after account creation. Mobile remains unverified; do not add SMS or phone-number sign-in unless the user asks.

**Why:** the user moved phone and country collection out of account creation and chose email as the only sign-in and verification channel.

**How to apply:** Keep registration limited to name, email, and password. Edit mobile/country under profile details; send verification, recovery, and optional 2FA codes to email.