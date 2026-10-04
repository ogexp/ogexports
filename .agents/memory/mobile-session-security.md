---
name: Mobile session security
description: OG Exports Security Center must manage Sanctum mobile tokens as well as browser sessions.
---

Mobile sign-ins use Sanctum personal access tokens, not Laravel's database-backed browser sessions. Security Center device listing and revocation must cover both stores. Revoke-other-devices preserves the current mobile token; logout-everywhere must then revoke the current token before clearing local credentials.

**Why:** Browser-session-only security endpoints left mobile devices invisible and active after a supposed all-device logout.

**How to apply:** When changing OG Exports session listing, individual device revocation, or logout-all behavior, handle browser sessions and Sanctum tokens explicitly, and never delete the current mobile token before the client can complete the server logout request.