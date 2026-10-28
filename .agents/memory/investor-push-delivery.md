---
name: Investor push delivery
description: Product constraints for enabling and completing OG Exports investor push notifications.
---

Use Expo Push for investor push delivery. Ask for notification permission only after the investor explicitly enables notifications in Settings. Laravel and the API Server have separate investor IDs, so payout push events cross services through a timestamped HMAC-signed request and map by normalized investor email. Deduplicate with a persistent event ID, then use the existing sender, which only targets active, unrevoked push tokens attached to non-revoked, unexpired sessions. Never invent an Expo project ID or claim pushes are live until a real project ID is configured and delivery is verified. Do not generate fake events or duplicate the in-app notification feed.

Android Expo Go no longer supports remote push delivery; remote-push testing must use an installed native development build.

**Why:** Push registration lives in the API Server's account/session store while payout progress is saved in Laravel. The signed bridge preserves the systems' separate identities and prevents unauthenticated requests from triggering investor pushes; an Expo project ID is still required to register new devices.

**How to apply:** Keep token registration scoped to authenticated investor sessions. Reuse the signed event pattern for Laravel-triggered pushes, keep the shared secret purpose-derived, and verify an actual delivery and tap route after the real Expo project ID is configured.