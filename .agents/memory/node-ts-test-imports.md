---
name: Node TypeScript test imports
description: Native Node test-runner import resolution for TypeScript utilities in the mobile package.
---

For `.mjs` tests run with Node's native test runner, direct `.ts` test imports work, but extensionless imports of sibling TypeScript modules can fail at runtime. Adding a `.ts` import suffix can then fail the package's default `tsc` check unless `allowImportingTsExtensions` is enabled.

**Why:** The currency-display tests exercised both native Node resolution and the Expo package's TypeScript check; using incompatible resolution styles caused one check to fail at a time.

**How to apply:** Keep utilities imported by native Node tests dependency-light and directly loadable. If cross-file TypeScript imports are needed, choose a loader/build setup supported by both the test command and `tsc` instead of weakening either check.
