---
name: API origin configuration
description: The user's interface constraint for configuring the OG Exports investor API.
---

Do not show the investor API server address anywhere in the OG Exports mobile UI, including login or Settings. Configure the production API through app environment/build configuration. Keep honoring any existing locally saved origin for compatibility, but do not expose an editor for it.

**Why:** On October 19, 2026 the user explicitly asked to hide the Investor API server setting so other people cannot see it.

**How to apply:** keep API origin selection internal to app configuration and the auth/network context. Do not add a user-facing server address field or save action.