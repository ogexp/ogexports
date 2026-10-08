---
name: Generated API declaration freshness
description: Keep mobile TypeScript checks aligned with generated API hooks.
---

When mobile TypeScript reports that an API hook is missing, confirm whether it exists in `lib/api-client-react/src/generated/api.ts` before changing application code. The TypeScript project reference may be resolving stale declarations under `lib/api-client-react/dist`.

**Why:** The generated source can be newer than the declaration output, causing a false missing-export error in dependent app typechecks.

**How to apply:** Rebuild the API-client project-reference declarations with `pnpm exec tsc -b lib/api-client-react/tsconfig.json --force`, then rerun the mobile typecheck.

Both Orval output targets use `clean: true`, so code generation cleans prior output before regenerating it; stale generated schemas can disappear when they are no longer present in the OpenAPI contract.

**Why:** OpenAPI edits can replace or remove generated files, so manual changes inside generated output are not durable.

**How to apply:** Make API contract changes in `lib/api-spec/openapi.yaml`, rerun `pnpm --filter @workspace/api-spec run codegen`, then rebuild project-reference declarations if mobile TypeScript still reports missing hooks.
