---
name: Financial transaction IDs
description: The investor product uses database primary IDs as the visible transaction IDs across backend, admin, and investor interfaces.
---

Financial transaction IDs are the database primary keys and must be exactly eight decimal digits. Do not replace them with a separate padded display-only transaction number. Keep backend IDs, relational references, and the IDs shown in admin and investor interfaces aligned; keep external payment references separate.

Legacy URLs may still carry the pre-conversion ID. Resolve only positive IDs below 10,000,000 by adding the 10,000,000 migration offset, and only when that exact ID does not already exist. Apply investor ownership/project constraints to the resolved lookup; do not apply this conversion to project IDs or unrelated records.

**Why:** the user explicitly chose changing the underlying primary IDs so the same ID is used across backend and interfaces. Old bookmarks can retain the pre-conversion number, while the database range guard reserves IDs below 10,000,000 for legacy resolution.

**How to apply:** when adding a financial record type or client surface, preserve the eight-digit database ID end to end and update its foreign-key or stored-ID references during any conversion. For legacy paths and ID filters, prefer an exact current ID and retain the request's ownership or record-type scope.
