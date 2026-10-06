---
name: Laravel test storage isolation
description: Protect checked-in Laravel test-disk fixtures while testing private-file uploads.
---

Do not use `Storage::fake('local')` in upload tests when the workspace has tracked content under Laravel's framework testing disk; faking the disk clears that shared directory. For tests that must use the real `local` disk, keep uploads unique and remove only the path created by the test in `afterEach`.

**Why:** A local-disk fake removed a checked-in sample report from the shared testing directory.

**How to apply:** Before adding storage fakes, check whether the disk root contains tracked test fixtures. Prefer precise cleanup of the test's own uploaded path.
