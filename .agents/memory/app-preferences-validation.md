---
name: Investor app preference validation
description: Laravel nested validation can silently discard supported language and appearance changes.
---

Declare every supported child of investor `preferences` explicitly in Laravel validation whenever any nested preference rule exists. A parent `array` rule does not preserve otherwise unvalidated siblings under the framework validation factory.

**Why:** Adding validation for currency left language, appearance and legacy theme without child rules. The API returned success while discarding those fields; a standalone validator reproduction retained only currency.

**How to apply:** Add the corresponding child validation whenever introducing a preference, and test both the update response and a subsequent profile read. Keep appearance and the legacy theme alias consistent. Treat an unconfirmed preference echo as a sync failure rather than reporting a successful account save.
