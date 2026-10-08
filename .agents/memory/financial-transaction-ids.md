---
name: Financial transaction IDs
description: The investor product uses database primary IDs as the visible transaction IDs across backend, admin, and investor interfaces.
---

Financial transaction IDs are the database primary keys and must be exactly eight decimal digits. Do not replace them with a separate padded display-only transaction number. Keep backend IDs, relational references, and the IDs shown in admin and investor interfaces aligned; keep external payment references separate.

**Why:** the user explicitly chose changing the underlying primary IDs so the same ID is used across backend and interfaces.

**How to apply:** when adding a financial record type or client surface, preserve the eight-digit database ID end to end and update its foreign-key or stored-ID references during any conversion.
