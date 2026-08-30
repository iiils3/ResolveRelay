# ResolveRelay migration history

This folder preserves the ResolveRelay-specific migration chain applied to the active Supabase project.

Included:

- `202608280001_initial_schema.sql`
- `202608280002_storage.sql`
- `202608280003_live_case_engine.sql`
- `202608280004_authenticated_grants.sql`
- `202608280005_edge_function_grants.sql`
- `202608280006_offer_action_grant.sql`
- `202608280007_notifications_realtime.sql`
- `202608280008_offer_response_grant.sql`
- `20260829205422_add_product_fingerprints.sql`
- `20260829230127_add_transaction_product_url.sql`
- `20260829235923_persist_signup_account_role.sql`
- `20260830000730_block_anonymous_resolverelay_access.sql`
- `20260830152330_grant_service_role_transaction_read.sql`

The last migration grants only `SELECT` on purchase transactions to the backend service role so `case-action` can validate that a partial refund is positive and does not exceed the original purchase amount.

Unrelated migrations that happen to live in the same hosted Supabase project are intentionally excluded from ResolveRelay source.

Together with the Edge Functions in `../functions/`, these files preserve the database/auth logic required to reconstruct the ResolveRelay backend on a fresh Supabase project. Existing production data itself remains in the hosted database and is not committed to GitHub.
