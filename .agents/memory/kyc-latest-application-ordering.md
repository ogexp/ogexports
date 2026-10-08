---
name: KYC latest-application ordering
description: Keep investor-facing KYC status, application details, and documents aligned across resubmissions.
---

When querying the latest KYC application by creation time, break ties with descending primary ID. SQLite timestamps in tests may have second-level precision, so quick resubmissions can share a timestamp and otherwise make the profile's status relation and its application/document query select different records.

**Why:** A rejection followed by a fresh upload created a new pending application in the same second as the rejected one; the profile status came from the new row while its application ID came from the older row.

**How to apply:** Use `created_at DESC, id DESC` consistently for investor KYC profile, upload, submission, and review-list queries. In resubmission tests, assert the new profile application ID differs from the rejected application.
