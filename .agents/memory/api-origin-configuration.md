---
name: API origin configuration
description: The user's interface constraint for configuring the OG Exports investor API.
---

Do not add an investor API server address input to the OG Exports mobile login screen. Configure the API origin through `EXPO_PUBLIC_API_BASE_URL` or the existing account Settings control.

**Why:** the user explicitly said not to show an API server address option on login.

**How to apply:** keep login/register forms focused on credentials; when the API origin is missing, show a clear configuration message rather than adding a URL field to login.