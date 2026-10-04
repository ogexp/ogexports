---
name: API origin configuration
description: The user's interface constraint for configuring the OG Exports investor API.
---

Do not show an investor API server address input on the OG Exports mobile login screen. The user's reference to restoring the API option means the backend login/signup APIs, not a URL field.

**Why:** the user clarified on October 4, 2026 that they meant backend APIs and do not want a server address field on login.

**How to apply:** keep login focused on credentials; configure API routing through the app environment or existing Settings control, and implement the requested auth endpoints on the server.