---
name: Investor push delivery
description: Product constraints for enabling and completing OG Exports investor push notifications.
---

Use Expo Push for investor push delivery. Ask for notification permission only after the investor explicitly enables notifications in Settings. Laravel and the API Server have separate investor IDs, so payout push events cross services through a timestamped HMAC-signed request and map by normalized investor email. Deduplicate with a persistent event ID, then use the existing sender, which only targets active, unrevoked push tokens attached to non-revoked, unexpired sessions. Never invent an Expo project ID or claim pushes are live until a real project ID is configured and delivery is verified. Do not generate fake events or duplicate the in-app notification feed.

Android Expo Go no longer supports remote push delivery; remote-push testing must use an installed native development build.

For Android Expo Push, a registered Expo token does not prove delivery. The Expo project needs a valid FCM V1 service-account key for the same Firebase project as `google-services.json`; that file is client config, not the service-account credential. An `InvalidCredentials` ticket can occur even when token registration succeeds. Updating only the Expo-side FCM credential does not require a new Android build. Check the ticket, receipt, and actual device display separately.

SecureStore keys for saved push tokens must use only alphanumeric characters, dots, hyphens, or underscores. Keep the account-scoped key generation shared by settings, profile, and sign-out.

**Why:** Push registration lives in the API Server's account/session store while payout progress is saved in Laravel. The signed bridge preserves the systems' separate identities and prevents unauthenticated requests from triggering investor pushes; an Expo project ID is still required to register new devices.

**How to apply:** Keep token registration scoped to authenticated investor sessions. Reuse the signed event pattern for Laravel-triggered pushes, keep the shared secret purpose-derived, and verify an actual delivery and tap route after the real Expo project ID is configured.

**Why:** A test push returned `InvalidCredentials` despite an active token; after the Expo FCM credential was corrected, its ticket and receipt succeeded and the alert appeared on the locked device.

**How to apply:** For Android `InvalidCredentials`, update the matching FCM V1 service-account key in Expo project credentials, then verify a ticket, receipt, and device display before calling delivery live. Do not ask the user to share the private JSON in chat.

**Why:** Android SecureStore rejected the push-token key when it contained a colon.

**How to apply:** Use the shared scoped-key helper whenever saving, reading, or deleting a device push token.

Status alerts must cover deposit, withdrawal, opportunity/trade, KYC, and support events. For deposits and withdrawals, mirror the in-app title/body and amount but strip transaction references and private notes. Keep KYC/support copy summary-only. Muting an in-app category must not silently disable device push.

**Why:** The user chose financial details on lock screens while keeping references, KYC information, and support conversations private.

**How to apply:** Pass financial notification text through the shared Laravel push bridge with reference/reason redaction; keep KYC/support copy generic, and verify provider tickets plus actual device display after rollout.