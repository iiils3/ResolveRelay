# ResolveRelay

ResolveRelay turns a purchase problem into a structured claim between a consumer and merchant, with evidence, secure merchant invitations, realtime updates, human-approved actions, optional AI assistance, and WebMCP tools.

## Live app

https://resolverelay-recovery-gxngvu.v2.appdeploy.ai/

## Launch pricing

ResolveRelay is free during the launch period through October 29, 2026. After the launch period, the planned price is **$1 per claim**. Payment enforcement is not enabled in the current launch build.

## What it does

- Consumers create a structured purchase claim and attach evidence.
- Each claim has a persistent consumer link.
- Merchants enter through a separate, secure, case-specific invitation flow.
- Merchant and consumer actions are recorded in a shared history.
- Realtime notifications keep both sides updated.
- AI provides neutral summaries, missing-evidence suggestions, and a practical next step. It does not provide legal advice or mutate claim state.
- Arabic/RTL and English/LTR are supported.

## WebMCP

ResolveRelay registers ten structured WebMCP tools through `document.modelContext.registerTool(...)` when the browser supports WebMCP:

1. `get_case_context`
2. `get_case_history`
3. `get_notifications`
4. `submit_case_to_merchant`
5. `create_merchant_invitation`
6. `accept_resolution`
7. `decline_resolution`
8. `merchant_request_evidence`
9. `merchant_offer_resolution`
10. `merchant_reject_case`

The internal tool names retain `case` for compatibility with the tested WebMCP contract, while the public product terminology is **claim / مطالبة**.

State-changing WebMCP tools require explicit human confirmation (`confirmed: true`) and still pass through the existing authorized Supabase backend. WebMCP does not bypass RLS or server-side authorization.

## Architecture

- React + TypeScript + Vite
- Supabase Auth / PostgreSQL / Storage / Realtime / Edge Functions
- AppDeploy backend AI generation for constrained claim assistance
- WebMCP browser tools

## Security model

- Supabase authentication
- Row Level Security
- private evidence storage and signed URLs
- separate consumer and merchant identities
- hashed, expiring, revocable merchant invitation tokens
- human confirmation for state-changing agent actions

ResolveRelay is not a law firm and does not provide legal advice.

## Development

Install dependencies and run the Vite app:

```bash
npm install
npm run dev
```

The public recovery build connects to the existing ResolveRelay Supabase backend with a browser-safe Supabase publishable key. Never place service-role keys, provider API keys, database passwords, or other backend secrets in frontend source.

## License

Apache-2.0
