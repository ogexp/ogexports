---
name: Investor app preference validation
description: Laravel nested validation can silently discard supported language and appearance changes.
---

Declare every supported child of investor `preferences` explicitly in Laravel validation whenever any nested preference rule exists. A parent `array` rule does not preserve otherwise unvalidated siblings under the framework validation factory.

**Why:** Adding validation for currency left language, appearance and legacy theme without child rules. The API returned success while discarding those fields; a standalone validator reproduction retained only currency.

**How to apply:** Add the corresponding child validation whenever introducing a preference, and test both the update response and a subsequent profile read. Keep appearance and the legacy theme alias consistent. Treat an unconfirmed preference echo as a sync failure rather than reporting a successful account save.

## Device readiness and responsive controls

Do not reject a preference selection solely because an initialization ref is not ready, or keep all preference controls disabled for the duration of account synchronization. Initialization and an early selection must share one bounded account-owned load; device persistence and remote synchronization are separate states.

**Why:** The user could reach Settings but all three selectors rejected taps with “Wait for your account preferences to load before saving.” Tests of the persistence writer alone had not exercised initialization or the first interaction.

**How to apply:** Exercise delayed/corrupt reads, the first selection, rapid appearance/language/currency changes and account switches. Preserve the latest local choice when an older network response arrives. Recover missing session ownership only from trusted user envelopes or a fresh authenticated response, never another account's cached profile.
