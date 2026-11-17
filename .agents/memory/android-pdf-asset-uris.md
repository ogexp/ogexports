---
name: Android PDF asset URIs
description: Avoid Android PDF export failures when reading bundled images through Expo FileSystem.
---

Expo Android bundled assets may provide a `localUri` that is not an absolute filesystem URI. Passing that value to `File.base64()` can fail with `java.lang.IllegalArgumentException: URI is not absolute`. A `file:` scheme prefix alone is not enough: values such as `file:relative/path.png` still do not identify an absolute local file.

**Why:** Android receipt PDF export hit this native exception while embedding the bundled OG Exports logo; later validation also showed that scheme-only checks can admit relative file paths.

**How to apply:** For native PDF HTML, use a validated absolute local asset URI when available, otherwise the asset's absolute source URI. Accept absolute file paths/URIs only; do not assume a non-empty URI or a `file:` prefix makes a value safe for Expo FileSystem reads.
