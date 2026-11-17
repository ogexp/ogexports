---
name: Android PDF asset URIs
description: Avoid Android PDF export failures when reading bundled images through Expo FileSystem.
---

Expo Android bundled assets may provide a `localUri` that is not an absolute filesystem URI. Passing that value to `File.base64()` can fail with `java.lang.IllegalArgumentException: URI is not absolute`.

**Why:** Android receipt PDF export hit this native exception while embedding the bundled OG Exports logo.

**How to apply:** For native PDF HTML, use a validated absolute local asset URI when available, otherwise the asset's absolute source URI. Do not assume every non-empty `Asset.localUri` is safe for Expo FileSystem reads.
