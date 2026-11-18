---
name: Expo pnpm injected peers
description: Duplicate React checks after Expo SDK upgrades in the pnpm workspace
---

After an Expo SDK upgrade changes React's peer version, pnpm's injected workspace dependencies can keep a stale peer link even when the lockfile is updated. Refresh the workspace installation before changing shared catalogs or adding overrides.

**Why:** Expo Doctor reported duplicate React until pnpm rebuilt the injected API-client workspace link; changing the shared React catalog would have risked unrelated web apps.

**How to apply:** If Expo Doctor reports a duplicate React or native module after an SDK upgrade, run a forced pnpm workspace install and rerun the Expo checks before editing shared dependency versions.
