---
name: Login and registration backend connection gate
description: The user's standing instruction about when OG Exports mobile login and registration may call the backend.
---

Do not connect the OG Exports mobile login or account-registration screens to the backend until the user explicitly asks for that connection. Until then, keep both flows frontend-only, do not send credentials or registration data, and do not simulate successful authentication or account creation.

**Why:** the user explicitly asked to defer backend connection for login and registration until they give the go-ahead.

**How to apply:** before editing either screen, preserve this gate; if a submit action is present, make it clear that no request was sent and no account/session was created.