---
name: Admin dashboard source
description: The user's requirement that the OG Exports admin dashboard come from their supplied original frontend ZIP.
---

Use the admin dashboard from the user's original frontend ZIP. Connect that existing implementation to the Laravel API; do not create a separate replacement dashboard.

**Why:** the user corrected a misunderstanding and said not to create a new admin dashboard; they want the ZIP dashboard connected to the existing app.

**How to apply:** before changing admin-dashboard UI, compare the current route and component to the uploaded ZIP. Preserve the ZIP-original dashboard and remove only a confirmed duplicate or replacement. If the removal target is unclear, ask before deleting.
