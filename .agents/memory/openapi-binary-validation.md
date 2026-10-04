---
name: OpenAPI binary upload validation
description: Orval and Zod generation behavior for binary request-body fields.
---

For OpenAPI uploads, define file content as `type: string` with `format: binary` and omit `maxLength`. Enforce byte limits in Laravel validation and describe accepted file sizes in the API or UI copy.

**Why:** Orval generates binary files as `Blob` schemas; `maxLength` becomes an unsupported `.max()` call and breaks the generated library typecheck.

**How to apply:** Keep upload-size constraints in server validation when the OpenAPI contract is code-generated, then rerun `pnpm --filter @workspace/api-spec run codegen`.