# ResolveRelay Supabase backend

This folder contains the source needed to reconstruct the ResolveRelay persistence and authorized claim-action backend currently deployed in Supabase project `mbhiaqhlhxjibuckdikq`.

Included Edge Functions:

- `functions/case-action` — authorized consumer/merchant state transitions, server-side input validation, partial-refund bounds, optimistic version checks, audit events, and notifications.
- `functions/merchant-invite` — creates hashed, expiring merchant invitations for consumer-owned claims.
- `functions/redeem-invite` — redeems an invitation only for an authenticated merchant-role account.
- `functions/evidence-url` — creates short-lived signed URLs for private evidence files.
- `migrations/` — the ResolveRelay-specific migration chain covering schema, storage, RLS/grants, realtime notifications, product fingerprints, product URLs, persistent signup roles, anonymous-access hardening, and the least-privilege transaction read required by `case-action`.

Production signup uses Supabase Auth directly. The temporary admin testing-registration endpoint used during development has been disabled on the hosted project and is intentionally not included in this repository.

The hosted database remains the source of truth for production rows. User data, evidence bytes, passwords, service-role/secret keys, database passwords, and AI provider secrets are never committed to GitHub.
