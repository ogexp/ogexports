---
name: Hostinger API deployment
description: Production hosting and access requirements for the OG Exports Laravel API.
---

The OG Exports production Laravel API is hosted on Hostinger Business. Deployments there are separate from Replit publishing and require SSH access authorized in Hostinger.

**Why:** The mobile app calls the Hostinger API domain directly, so publishing the Replit workspace cannot update server routes or migrations.

**How to apply:** For production Laravel changes, use the supplied backend source and deploy to Hostinger only after a valid SSH key is authorized. Never replace the production `.env`; apply required migrations after deploying code.

In this workspace, HTTPS access to `GIT_URL` only provides repository access; there is no checked-in Hostinger auto-deployment workflow. The workspace FTPS route was unreachable, so a successful Git read or push must not be treated as a production deployment.

**Why:** Auto-invest deployment attempts confirmed that source control access and Hostinger runtime access are separate, and the feature requires running its Laravel migration as well as uploading code.

**How to apply:** If SSH is unavailable, confirm an actual Hostinger deployment mechanism and command path before changing production. Do not upload only the Laravel files while leaving their migration unapplied.
