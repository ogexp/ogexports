---
name: API origin configuration
description: The user's interface constraint for configuring the OG Exports investor API.
---

Do not show an investor API server address input on the OG Exports mobile login screen. The user's reference to restoring the API option means the backend login/signup APIs, not a URL field.

**Why:** the user clarified on October 4, 2026 that they meant backend APIs and do not want a server address field on login.

**How to apply:** keep login focused on credentials; configure API routing through the app environment or existing Settings control, and implement the requested auth endpoints on the server.

Evaluate physical Expo Go authentication separately from browser-preview CORS failures.

**Why:** The user confirmed that phone login and registration both worked after the app-side auth fixes, while the browser preview's origin was still blocked by the live API's CORS policy.

**How to apply:** A browser `Failed to fetch` caused by CORS is not evidence that native QR-preview authentication is broken. Keep the native and web outcomes distinct when diagnosing or reporting auth.