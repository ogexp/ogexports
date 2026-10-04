---
name: Investor notification preference migration
description: Backward-compatible in-app notification categories and preference controls.
---

New in-app category preference keys take precedence over legacy per-event keys. When deriving a category's initial state from legacy settings, a missing legacy key retains the enabled default; disable the category only when every legacy key for it is explicitly false. Save a changed category as an explicit category key and preserve all other preference keys. These controls affect new in-app notification delivery, not existing notifications, email delivery, or device push registration.

**Why:** Existing investor profiles may contain only some legacy keys. Treating missing keys as disabled or replacing the preference map would silently mute alerts or erase settings.

**How to apply:** Use the Laravel investor profile API as the source of truth, merge `notification_prefs`, retain `inApp` and legacy keys, and describe category toggles as controlling future in-app notifications only.