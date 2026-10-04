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

**Why:** the user established these as platform-wide acceptance criteria for the OG Exports investor app.

**How to apply:** check the API contract and UI together when changing investor flows; preserve verification gates, expose available documents and authoritative statuses, and group detailed trade information without obscuring missing data.