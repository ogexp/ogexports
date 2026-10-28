---
name: Investor push delivery
description: Product constraints for enabling and completing OG Exports investor push notifications.
---

Use Expo Push for investor push delivery. Ask for notification permission only after the investor explicitly enables notifications in Settings. Laravel and the API Server have separate investor IDs, so payout push events cross services through a timestamped HMAC-signed request and map by normalized investor email. Deduplicate with a persistent event ID, then use the existing sender, which only targets active, unrevoked push tokens attached to non-revoked, unexpired sessions. Never invent an Expo project ID or claim pushes are live until a real project ID is configured and delivery is verified. Do not generate fake events or duplicate the in-app notification feed.

For Play Store Android push builds, require the Firebase client configuration for the exact app package and reference it from Expo's Android app config. A project ID alone does not initialize Firebase Messaging or enable FCM token registration.

Android Expo Go no longer supports remote push delivery; remote-push testing must use an installed native development build.

**Why:** Push registration lives in the API Server's account/session store while payout progress is saved in Laravel. The signed bridge preserves the systems' separate identities and prevents unauthenticated requests from triggering investor pushes; production Android additionally needs valid Firebase configuration to initialize messaging.

**How to apply:** Keep token registration scoped to authenticated investor sessions. Reuse the signed event pattern for Laravel-triggered pushes, keep the shared secret purpose-derived, configure the package-matched Android Firebase client file, and verify an actual delivery and tap route.