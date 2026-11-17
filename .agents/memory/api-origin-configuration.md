---
name: API origin configuration
description: The user's interface constraint for configuring the OG Exports investor API.
---

Do not display or let investors edit the API server address anywhere in the OG Exports mobile app. Keep the API base URL internal to app configuration.

**Why:** the user asked to hide the investor API server address from users.

**How to apply:** configure the API base URL through app build/environment settings. Keep login focused on credentials, remove user-facing server controls, and use plain support-oriented errors without exposing configuration details.

Evaluate physical Expo Go authentication separately from browser-preview CORS failures.

**Why:** The user confirmed that phone login and registration both worked after the app-side auth fixes, while the browser preview's origin was still blocked by the live API's CORS policy.

**How to apply:** A browser `Failed to fetch` caused by CORS is not evidence that native QR-preview authentication is broken. Keep the native and web outcomes distinct when diagnosing or reporting auth.