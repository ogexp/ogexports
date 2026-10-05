---
name: Investor push delivery
description: Product constraints for enabling and completing OG Exports investor push notifications.
---

Use Expo Push for investor push delivery. Ask for notification permission only after the investor explicitly enables notifications in Settings. Never invent an Expo project ID or claim pushes are live until a real project ID and the business-event source, including its investor identity mapping, are configured. Do not generate fake events or duplicate the existing in-app notification feed.

Android Expo Go no longer supports remote push delivery; remote-push testing must use an installed native development build.

**Why:** The user selected Expo Push, but the project has no Expo project ID and the API server has no real investor notification event source.

**How to apply:** Keep token registration scoped to authenticated investor sessions. When the user provides the project ID and chooses the business event source, wire that source to the server sender and verify an actual delivery and tap route.