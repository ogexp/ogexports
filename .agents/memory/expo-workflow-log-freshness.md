---
name: Expo workflow log freshness
description: Check current Metro state when persistent logs disagree with source and platform exports.
---

When a Metro error from existing workflow output conflicts with a successful platform export or the current source, restart the managed Expo workflow and inspect its new logs before editing source. Older output may describe an earlier app state.

**Why:** A previous workflow log showed a JSX mismatch while iOS and Android exports succeeded; a fresh restart started Metro without that parser error.

**How to apply:** After source changes, export the app as appropriate. If workflow output disagrees with those results, use the artifact-managed workflow restart and fresh logs to distinguish stale output from a live failure.
