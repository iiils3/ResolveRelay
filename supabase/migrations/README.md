# ResolveRelay migration history

This folder preserves the ResolveRelay-specific migration chain applied to the active Supabase project.

Included:

- 202608280001 initial_schema
- 202608280002 storage
- 202608280003 live_case_engine
- 202608280004 authenticated_grants
- 202608280005 edge_function_grants
- 202608280006 offer_action_grant
- 202608280007 notifications_realtime
- 202608280008 offer_response_grant
- 20260829205422 add_product_fingerprints
- 20260829230127 add_transaction_product_url
- 20260829235923 persist_signup_account_role
- 20260830000730 block_anonymous_resolverelay_access

The unrelated SAYYAD migrations that happen to live in the same hosted Supabase project are intentionally excluded from ResolveRelay source.

Together with the Edge Functions in `../functions/`, these files preserve the database/auth logic required to reconstruct the ResolveRelay backend on a fresh Supabase project. Existing production data itself remains in the active hosted Supabase database and is not committed to GitHub.
