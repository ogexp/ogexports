---
name: OG Exports platform principles
description: Trust, trade transparency, real-world trade, simplicity, premium quality, and security requirements for the investor app.
---

The OG Exports investor app must communicate:
- **Trust:** clear information, verification, documents, and transparent status.
- **Transparency:** investors can identify the exact trade or container associated with an investment.
- **Real-world trade:** each opportunity represents a real import/export or container-based trade opportunity.
- **Simplicity:** present complex trade information in a clear, investor-friendly way.
- **Premium experience:** make every screen intentional, polished, and modern.
- **Security:** financial actions require appropriate authentication and verification.

Use server-provided trade identifiers, shipment details, documents, and statuses as the source of truth. Do not invent missing values or imply live logistics tracking. Make an investment's trade/container association easy to find, and state clearly when OG Exports has not supplied information.

Timeline stage names may be shown as the standard visual sequence, but each stage's status, description, and date must be supplied by the backend/admin system. Show unavailable when a stage update is missing; never infer progress from stage order, dates, or a trade-level status.

Project/trade update feeds are separate append-only event records, not reconstructions of the standard journey stages. Each event's status, description, event time, and optional attachment must be explicitly supplied by OG Exports; leave the feed empty until an update is published. Require admins to enter the event time instead of defaulting it from the device clock.

**Why:** the user requires project updates to be authoritative and forbids invented update history, dates, or shipment claims.

**How to apply:** use persisted backend/admin events for the feed, preserve each event as published, and show an honest empty state when none exist.

When no carrier/shipping API is integrated, label only a backend-supplied timestamp as “Last Updated” and clearly state that live tracking is not connected. Never simulate a live position or use the device clock as a tracking update.

**Why:** the user explicitly requires “Never fake live tracking.”

**How to apply:** make live-data claims conditional on a real carrier integration, and keep shipment refresh/update timestamps server-sourced.

KYC gating applies to investments only: require a server-reported `Verified` status before allowing an investment, and leave deposits and withdrawals unchanged. Never infer verification from submitted forms or uploaded documents.

**Why:** the user chose to gate only investments; approval must remain authoritative to OG Exports.

**How to apply:** fail closed for investment access when KYC status is missing, loading, or unavailable. Do not add KYC checks to deposits or withdrawals unless the user changes this scope.

**Why:** the user established these as platform-wide acceptance criteria for the OG Exports investor app.

**How to apply:** check the API contract and UI together when changing investor flows; preserve verification gates, expose available documents and authoritative statuses, and group detailed trade information without obscuring missing data.

**Why:** the user explicitly requires trade timeline statuses to remain under backend/admin control.

**How to apply:** render stages consistently across trade detail views, but mark completion or in-progress status only from that stage's server-provided event.