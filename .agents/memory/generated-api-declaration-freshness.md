---
name: Generated API declaration freshness
description: Keep mobile TypeScript checks aligned with generated API hooks.
---

When mobile TypeScript reports that an API hook is missing, confirm whether it exists in `lib/api-client-react/src/generated/api.ts` before changing application code. The TypeScript project reference may be resolving stale declarations under `lib/api-client-react/dist`.

**Why:** The generated source can be newer than the declaration output, causing a false missing-export error in dependent app typechecks.

**How to apply:** Rebuild the API-client project-reference declarations with `pnpm exec tsc -b lib/api-client-react/tsconfig.json --force`, then rerun the mobile typecheck.
