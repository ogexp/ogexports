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

KYC gating applies to investments only: require a server-reported `Verified` status before allowing an investment, and leave deposits and withdrawals unchanged. Never infer verification from submitted forms or uploaded documents.

**Why:** the user chose to gate only investments; approval must remain authoritative to OG Exports.

**How to apply:** fail closed for investment access when KYC status is missing, loading, or unavailable. Do not add KYC checks to deposits or withdrawals unless the user changes this scope.

**Why:** the user established these as platform-wide acceptance criteria for the OG Exports investor app.

**How to apply:** check the API contract and UI together when changing investor flows; preserve verification gates, expose available documents and authoritative statuses, and group detailed trade information without obscuring missing data.