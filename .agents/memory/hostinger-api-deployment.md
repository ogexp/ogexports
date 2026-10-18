---
name: Hostinger API deployment
description: Production hosting and access requirements for the OG Exports Laravel API.
---

The OG Exports production Laravel API is hosted on Hostinger Business. Deployments there are separate from Replit publishing and require SSH access authorized in Hostinger.

**Why:** The mobile app calls the Hostinger API domain directly, so publishing the Replit workspace cannot update server routes or migrations.

**How to apply:** For production Laravel changes, use the supplied backend source and deploy to Hostinger only after a valid SSH key is authorized. Never replace the production `.env`; apply required migrations after deploying code.

In this workspace, HTTPS access to `GIT_URL` only provides repository access; there is no checked-in Hostinger auto-deployment workflow. Hostinger FTPS can upload source, but the configured server address may be an IP while its certificate is issued for `hstgr.io`; use the verified certificate hostname with an explicit IP mapping, never disable TLS verification.

**Why:** The FTPS endpoint became reachable when the request used its certificate hostname mapped to the configured server IP. The prior direct-IP request failed certificate validation; disabling verification would expose credentials to interception.

**How to apply:** Compare the live Laravel files with the supplied source before uploading. Use FTPS only for code-only changes; it cannot run Artisan migrations or prove runtime behavior. Handle migrations through an authorized server route, and do not treat Git access as a production deployment.
