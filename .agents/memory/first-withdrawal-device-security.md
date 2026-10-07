---
name: First-withdrawal device security
description: When the investor app should prompt users to configure a device PIN or biometrics.
---

Do not show or require a first-withdrawal app PIN or biometric setup prompt. Keep existing OTP and transaction-password verification for withdrawal requests.

**Why:** the user requested that new investors not see a device-security setup prompt before withdrawing.

**How to apply:** do not gate the withdrawal flow on withdrawal history or configured device biometrics/PIN. Leave optional device-security settings and server-side withdrawal authentication unchanged.
