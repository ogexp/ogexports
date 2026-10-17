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

The six container milestones use explicit, append-only per-stage admin records, separate from the trade-update feed and container journey. Show each stage from its latest saved record. If the server supplies `current_project_stage` and no explicit record exists for that stage, highlight only that reported stage as current/in progress; never infer earlier completed stages. Scoped exception requested on 2026-10-06: when the server's project status is `settled` and no explicit Settled milestone exists, show only the final Settled milestone as completed; do not infer earlier milestones or event details.

**Why:** per-stage records preserve milestone history. The user additionally reported that an admin-updated project status of Settled must appear in the investor detail timeline.

**How to apply:** prefer each stage's latest saved admin record. Use `current_project_stage` only as a single active-stage highlight when that stage has no saved record; do not invent dates/descriptions or completed earlier stages. Only use `project.status === settled` as a fallback for the final Settled milestone when no explicit record exists, and suppress the current-stage fallback in that case.

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

**How to apply:** render stages consistently across trade detail views using their latest server-provided event, with the scoped final-Settled project-status fallback above. Keep app detail data fresh when the screen regains focus or the app returns to the foreground.

Localized financial, security, and privacy copy must preserve the source action and status. Transaction copy distinguishes submitted, approved, and completed: approval is not completion, withdrawal approval is not a completed transfer, and deposit approval alone does not confirm wallet credit. A data-access, correction, or deletion ticket is a request—not a promise of completion, and session revocation must communicate that access will end.

**Why:** small wording shifts in investor-facing Urdu and Arabic can change what users believe has happened or what the support team has agreed to do.

**How to apply:** map each transaction state to explicit server statuses across mobile and web; only server-reported completion may claim a completed transfer or wallet credit. Review translated copy against API behavior, especially for balances, withdrawals, account security, and privacy requests.