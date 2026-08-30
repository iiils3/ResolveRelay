# ResolveRelay Supabase backend

This folder is a source backup of the ResolveRelay Supabase backend currently deployed in project `mbhiaqhlhxjibuckdikq`.

Included here:

- `functions/test-register` — temporary testing registration endpoint that creates confirmed password accounts and fixes the selected account role at creation.
- `functions/case-action` — authorized consumer/merchant state transitions.
- `functions/merchant-invite` — creates hashed, expiring merchant invitations.
- `functions/redeem-invite` — accepts invitations only for merchant-role accounts.
- `functions/evidence-url` — creates short-lived signed evidence URLs.
- `migrations/` — the complete ResolveRelay-specific migration chain currently applied to the hosted project, from initial schema through product fingerprints, product URLs, persistent account roles, and anonymous-access lockdown.

The hosted database remains the active persistence layer during the AppDeploy-to-Netlify migration. Existing user/claim data is not stored in GitHub; GitHub preserves the code and database definition needed to reconstruct the backend.

Never commit Supabase service-role keys, database passwords, or provider secrets to this repository.
