---
name: Android file picker uploads
description: Native investor file uploads should retain Android's selected document access grant.
---

On native investor attachment flows, use Expo FileSystem's `File.pickFileAsync` and pass the returned `File` into `uploadInvestorFile`. Keep DocumentPicker as the web path because Expo FileSystem's picker is unsupported on web.

**Why:** The Android DocumentPicker cache-copy URI reached `File.exists === false` in the payment-proof flow, causing the app to stop before making the server request. The FileSystem picker returns a file reference with persistable SAF access; avoid reconstructing it from its URI.

**How to apply:** Preserve the native `File` object through size validation and multipart upload. Keep existing file-size and MIME checks, and maintain a separate web picker branch.
