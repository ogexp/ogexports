---
name: Wallet activity preview
description: User-confirmed compact Wallet preview and pending deposit visibility rules.
---

Wallet should show **only the latest five transactions**, not an all-records list. The separate transaction-history screen remains the place for complete history.

**Why:** The user explicitly clarified “Sirf latest 5 transactions” after reporting that pending deposits appeared on Home and in history but were missing from Wallet.

**How to apply:** Include unposted deposit requests alongside ledger activity in the preview, with no duplicate when a request posts. Keep pending-deposit amounts clearly separate from spendable/withdrawable funds. Place Quick Actions directly after the green balance hero, before Balance Breakdown and activity. Show the pending total once as a Balance Breakdown metric with full-history navigation, not a separate request card. All transaction rows belong below Add Funds and Withdraw.

**Why:** The user reported the deposit appearing twice and explicitly requested no transaction entries above the Quick Actions buttons. Distinct actual ledger postings must not be hidden merely because their amounts or references match.
