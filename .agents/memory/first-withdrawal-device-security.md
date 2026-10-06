---
name: First-withdrawal device security
description: When the investor app should prompt users to configure a device PIN or biometrics.
---

App PIN or biometric setup should be offered during the user's first withdrawal, not forced from investment confirmation. Existing configured device confirmation may still authenticate investments; an investment should not require the user to open Account security when no method is configured.

**Why:** the user said first-time device-security setup belongs in the withdrawal flow and should not interrupt investing.

**How to apply:** use server withdrawal history to determine whether a withdrawal has already occurred; show the setup gate only when there is no prior withdrawal and no device method is configured. Keep the existing withdrawal authentication requirements intact.
