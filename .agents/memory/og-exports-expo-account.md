---
name: OG Exports Expo and GitHub separation
description: Keep OG Exports builds on its own Expo project and GitHub repository.
---

OG Exports uses a separate Expo account/project from OG Landmark. The existing OG Landmark Expo project is not the OG Exports project; use only the account and project details the user provides for OG Exports.

After a rollback, verify the configured Expo project association against the user's confirmed dashboard project before requesting new credentials. Resolve by the confirmed account/project name, and compare its known build metadata with the local configuration.

**Why:** Different user-supplied dashboard links referred to distinct project IDs. A readable older project was initially mistaken for the intended release project; read access alone did not establish the correct production association.

**How to apply:** Match the user's final confirmed dashboard link against the previous release's bundled project association. Never switch a production app to another project merely because that project is accessible. Treat identity mismatch, account permissions and expired credentials separately.

An AAB's embedded Expo configuration identifies the configuration bundled in that file, not independently the account/project that executed its build. Do not assume a workspace AAB is the exact release the user means.

**Why:** The user corrected an assertion about their prior build's project after a local artifact's embedded slug was mistaken for proof of build origin.

**How to apply:** Match the exact artifact to its build-details link before making claims about historical build origin; report bundled metadata and verified build-service metadata separately.

The user confirmed `ogexp/ogexports` as the GitHub repository for OG Exports.

**Why:** The user selected the repository shown in the Expo connection screen after earlier context identified a different repository.

**How to apply:** Before an OG Exports build or account link, use only its own Expo project and `ogexp/ogexports` repository; never reuse OG Landmark identifiers, credentials, or repository.

Verify repository access with a real read before uploading. A Replit GitHub source-control connection may report as active while `git ls-remote` still fails and the GitHub App connection returns 404 for `ogexp/ogexp`.

**Why:** Connecting GitHub in the workspace did not make the OG Exports repository visible to the existing GitHub App or authenticate HTTPS Git in that session.

**How to apply:** If either read fails, stop before writing to any repository and have the user grant/reconnect access for the account that owns `ogexp/ogexports`.

Before pushing, verify the live `origin` URL. Replit's Git settings can leave the workspace pointing at `ogexp/Investor-Suite-Builder`, which is not the selected OG Exports repository. Even after GitHub repo access is granted, a direct HTTPS push may still fail with an invalid-credential error while the Git pane reports GitHub as active.

**Why:** The workspace remote initially targeted the wrong repository, and the shell push was rejected despite read access and the GitHub app showing active.

**How to apply:** Never push until `origin` exactly matches `ogexp/ogexports`; use the Replit Git pane's authenticated flow or resolve its GitHub credential connection if direct push is rejected.
