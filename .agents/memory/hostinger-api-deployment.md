---
name: Hostinger API deployment
description: Production hosting and access requirements for the OG Exports Laravel API.
---

The OG Exports production Laravel API is hosted on Hostinger Business. Deployments there are separate from Replit publishing and require SSH access authorized in Hostinger.

**Why:** The mobile app calls the Hostinger API domain directly, so publishing the Replit workspace cannot update server routes or migrations.

**How to apply:** For production Laravel changes, use the supplied backend source and deploy to Hostinger only after a valid SSH key is authorized. Never replace the production `.env`; apply required migrations after deploying code.
