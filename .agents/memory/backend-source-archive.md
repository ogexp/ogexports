---
name: Backend source archive
description: Use the supplied Laravel backend ZIP when working on OG Exports server features.
---

The user has already supplied the OG Exports Laravel backend ZIP. Check attached backend archives before asking for a separate repository or repeating requests for the source.

**Why:** The user corrected this on 2026-10-09 after the external API issue was traced to a missing server-side change.

**How to apply:** List archive contents first; inspect only needed code files and never read or include its `.env`. Compare the supplied archive with the local Laravel snapshot before preparing changes. Do not claim an external API is updated until its deployment is confirmed.
