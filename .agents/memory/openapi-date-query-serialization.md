---
name: OpenAPI date query serialization
description: Keep generated date-only query parameters in YYYY-MM-DD string form.
---

Declare date-only OpenAPI query parameters as strings with a strict `YYYY-MM-DD` pattern instead of `format: date` while the current Orval client generator is in use. With the workspace's global date conversion setting, `format: date` generates a JavaScript `Date`, and the generated query builder applies `String(value)`, producing a non-ISO date string.

**Why:** The Laravel endpoint validates exact `Y-m-d` values, and generated clients must not silently serialize date filters into locale-formatted strings.

**How to apply:** For date-only query filters, keep the generated TypeScript parameter as `string`, constrain the pattern in OpenAPI, and rerun codegen before updating callers. Revisit this rule if the generated client adds explicit date-only serialization.
