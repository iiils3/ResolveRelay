# ResolveRelay migration snapshot

The active Supabase project contains the full historical migration chain. This repository currently preserves the most recent authentication/role hardening migrations that are essential to the current deployed account model.

Applied ResolveRelay migration history in the hosted project includes:

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

The unrelated SAYYAD migrations that happen to live in the same hosted Supabase project are intentionally not treated as part of ResolveRelay source.

Before creating a brand-new Supabase project from this repository alone, export the earlier ResolveRelay migrations/schema from the hosted project so the full database can be reconstructed exactly.
