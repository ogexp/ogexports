---
name: Wallet activity preview
description: User-confirmed compact Wallet preview and pending deposit visibility rules.
---

Wallet should show **only the latest five transactions**, not an all-records list. The separate transaction-history screen remains the place for complete history.

**Why:** The user explicitly clarified “Sirf latest 5 transactions” after reporting that pending deposits appeared on Home and in history but were missing from Wallet.

**How to apply:** Include unposted deposit requests alongside ledger activity in the preview, with no duplicate when a request posts. Keep pending-deposit amounts clearly separate from spendable/withdrawable funds. Preserve visibility of pending deposits even when they are older than the five-row preview through the pending-deposit summary and full-history navigation.
