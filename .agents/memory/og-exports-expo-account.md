---
name: OG Exports Expo and GitHub separation
description: Keep OG Exports builds on its own Expo project and GitHub repository.
---

OG Exports uses a separate Expo account/project from OG Landmark. The existing OG Landmark Expo project is not the OG Exports project; use only the account and project details the user provides for OG Exports.

The OG Exports GitHub repository is `ogexp/ogexp`, which the user says is connected to Replit.

**Why:** The user stated OG Landmark and OG Exports use different Expo accounts, and identified `ogexp/ogexp` as OG Exports' Replit-connected GitHub repo.

**How to apply:** Before an OG Exports build or account link, use only its own Expo project and `ogexp/ogexp` repository; never reuse OG Landmark identifiers, credentials, or repository.

Verify repository access with a real read before uploading. A Replit GitHub source-control connection may report as active while `git ls-remote` still fails and the GitHub App connection returns 404 for `ogexp/ogexp`.

**Why:** Connecting GitHub in the workspace did not make the OG Exports repository visible to the existing GitHub App or authenticate HTTPS Git in that session.

**How to apply:** If either read fails, stop before writing to any repository and have the user grant/reconnect access for the account that owns `ogexp/ogexp`.
