# Threat Model

## Project Overview

OG Exports provides investor and administrator experiences through an Expo mobile app and a web admin portal, with Laravel as the authoritative API for investor identity, investments, wallet activity, documents, and shipment records. The API also serves other business roles. Mobile clients use bearer-token authentication; browser sessions use Sanctum's stateful API flow.

## Assets

- **Investor identity and account access** — passwords, verification codes, optional 2FA, browser sessions, and mobile access tokens.
- **Investor financial records** — balances, investments, deposits, withdrawals, distributions, transaction references, and statements. Incorrect disclosure or mutation can cause financial harm.
- **KYC and trade documents** — identity records and commercial documents; unauthorized viewing or download exposes sensitive personal and business data.
- **Shipment and trade records** — status, milestones, attachments, and counterparties; client-side guesses must not be presented as verified backend facts.
- **Administrator privileges and audit history** — role-protected actions that can change accounts, finances, and shipments.
- **Application secrets and signing material** — session keys, database credentials, mail/push credentials, and API tokens. Keep these in managed secrets and out of client bundles, logs, and responses.

## Trust Boundaries

- **Mobile/web client to API** — clients are untrusted; Laravel must authenticate, validate, and authorize every protected request.
- **Unauthenticated to authenticated API** — login, registration, email verification, password recovery, and 2FA endpoints are public but must be abuse-resistant.
- **Investor to administrator role** — investor and admin permissions must be enforced by server middleware and ownership-scoped queries, not by hidden UI.
- **API to database and file storage** — database rows and private files must remain scoped to their account or authorized role.
- **API to email and push providers** — OTP and notification delivery crosses to external services; only approved event data should leave the API.
- **Deployment edge to Laravel** — TLS termination and forwarded client-IP headers depend on the trusted proxy configuration and must be verified against the actual hosting path.

## Scan Anchors

- Public, authenticated, investor, and admin route boundaries: `laravel-backend/routes/api.php`
- Authentication, 2FA, session revocation, and transaction-password controls: `laravel-backend/app/Http/Controllers/Api/AuthController.php`, `SecurityController.php`
- Investor financial and document access: `laravel-backend/app/Http/Controllers/Api/Investor/`
- Mobile auth, notification routing, and local session handling: `artifacts/mobile/app/`, `artifacts/mobile/context/`, `artifacts/mobile/lib/`
- Web admin entry point: `artifacts/og-container-admin/src/`; keep the ZIP-original dashboard as the source.
- `artifacts/mockup-sandbox/` is a design preview service, not the investor data source.

## Threat Categories

### Spoofing

An attacker could guess passwords or OTPs, steal a bearer token, or reuse a revoked device session. Authentication routes must be rate-limited; OTP challenges must have bounded lifetime and attempts; protected requests must validate Sanctum credentials. Mobile biometrics may unlock only a securely stored, account-scoped session and must not replace password recovery or server authentication.

### Tampering

Clients can alter IDs, amounts, statuses, dates, and role claims. Laravel must calculate or verify financial values server-side, validate request data, enforce role checks, and scope record lookups to the authenticated owner. Investor-facing status and financial copy must use server-reported data; absent values remain explicitly unavailable.

### Repudiation

Sensitive changes to accounts, financial records, session security, and shipment updates need server-side audit records that identify the actor and event time. Client display timestamps are not a substitute for the API's event time.

### Information Disclosure

Cross-account IDORs could expose wallets, statements, KYC files, or trade documents. Every detail, download, and export query must be owner- or role-scoped. Responses and logs must not expose credentials, OTPs, or unnecessary PII. Production TLS, secret handling, and database/file-at-rest encryption depend partly on deployment configuration and must be verified there rather than assumed from client code.

### Denial of Service

Password, verification, recovery, 2FA, upload, investment, and withdrawal endpoints can be abused. Apply endpoint-specific request limits and retain server-side OTP attempt limits. Upload handlers must bound file size and allowed type. Because `bootstrap/app.php` trusts forwarded proxies broadly, production must confirm the API cannot be reached through an untrusted proxy path and that client IP headers are set only by the trusted edge; otherwise IP-based limits can be bypassed.

### Elevation of Privilege

Investor and admin routes must keep server-side role middleware. Record identifiers, notification links, and client-provided ownership fields must never grant access by themselves. Tests should cover both successful owner access and rejection of another investor's record.
