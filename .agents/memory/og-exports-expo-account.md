---
name: OG Exports Expo and GitHub separation
description: Keep OG Exports builds on its own Expo project and GitHub repository.
---

OG Exports uses a separate Expo account/project from OG Landmark. The existing OG Landmark Expo project is not the OG Exports project; use only the account and project details the user provides for OG Exports.

The user confirmed `ogexp/ogexports` as the GitHub repository for OG Exports.

**Why:** The user selected the repository shown in the Expo connection screen after earlier context identified a different repository.

**How to apply:** Before an OG Exports build or account link, use only its own Expo project and `ogexp/ogexports` repository; never reuse OG Landmark identifiers, credentials, or repository.

Verify repository access with a real read before uploading. A Replit GitHub source-control connection may report as active while `git ls-remote` still fails and the GitHub App connection returns 404 for `ogexp/ogexp`.

**Why:** Connecting GitHub in the workspace did not make the OG Exports repository visible to the existing GitHub App or authenticate HTTPS Git in that session.

**How to apply:** If either read fails, stop before writing to any repository and have the user grant/reconnect access for the account that owns `ogexp/ogexports`.

Before pushing, verify the live `origin` URL. Replit's Git settings can leave the workspace pointing at `ogexp/Investor-Suite-Builder`, which is not the selected OG Exports repository. Even after GitHub repo access is granted, a direct HTTPS push may still fail with an invalid-credential error while the Git pane reports GitHub as active.

**Why:** The workspace remote initially targeted the wrong repository, and the shell push was rejected despite read access and the GitHub app showing active.

**How to apply:** Never push until `origin` exactly matches `ogexp/ogexports`; use the Replit Git pane's authenticated flow or resolve its GitHub credential connection if direct push is rejected.
