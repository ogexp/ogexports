---
name: Mobile session security
description: OG Exports mobile sessions, app locking, and Security Center must preserve secure behavior.
---

Mobile sign-ins use Sanctum personal access tokens, not Laravel's database-backed browser sessions. Security Center device listing and revocation must cover both stores. Revoke-other-devices preserves the current mobile token; logout-everywhere must then revoke the current token before clearing local credentials.

Opening the native file picker for a deposit proof must not lock the active session or discard the deposit form. Suppress the app-background lock only while that picker is active; keep normal app PIN/biometric locking for other background transitions.

**Why:** Browser-session-only security endpoints left mobile devices invisible and active after a supposed all-device logout. The user also reported that returning from deposit proof selection sent them to app-PIN/login and interrupted the deposit. A real Android check confirmed selection and cancellation preserve the deposit form without prompting for PIN/login, while backgrounding outside the picker still triggers the lock.

**How to apply:** When changing OG Exports session listing, device revocation, logout-all, or native file pickers, preserve the browser/Sanctum distinction and keep picker-specific lock suppression scoped to the picker lifetime.