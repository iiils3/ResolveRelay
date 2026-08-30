# ResolveRelay Supabase backend

This folder is a source backup of the ResolveRelay Supabase backend that is currently deployed in project `mbhiaqhlhxjibuckdikq`.

Included here:

- `functions/test-register` — temporary launch/testing registration endpoint that creates confirmed password accounts and fixes the account role at creation.
- `functions/case-action` — authorized consumer/merchant state transitions.
- `functions/merchant-invite` — creates hashed, expiring merchant invitations.
- `functions/redeem-invite` — accepts invitations only for merchant-role accounts.
- `functions/evidence-url` — creates short-lived signed evidence URLs.
- `migrations/20260829235923_persist_signup_account_role.sql` — persists consumer/merchant role at account creation.
- `migrations/20260830000730_block_anonymous_resolverelay_access.sql` — blocks anonymous sessions from ResolveRelay claim access and writes.

The hosted Supabase project also contains earlier schema migrations that created the claim tables, storage bucket, RLS policies, realtime publication, product fingerprints, and transaction product URL. The hosted database remains the active persistence layer during the AppDeploy-to-Netlify migration.

Never commit Supabase service-role keys, database passwords, or provider secrets to this repository.
