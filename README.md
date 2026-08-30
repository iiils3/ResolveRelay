# ResolveRelay

ResolveRelay turns a post-purchase problem into a structured claim between a consumer and a merchant, with durable account-backed claims, evidence, secure merchant invitations, realtime updates, human-approved actions, optional AI assistance, merchant-support discovery, and WebMCP tools.

> Repository note: this repository still has the historical GitHub name `ClaimGuard`. The product name is **ResolveRelay**. The source has been synchronized from the current ResolveRelay recovery deployment before migration away from AppDeploy.

## Current live recovery build

https://resolverelay-recovery-gxngvu.v2.appdeploy.ai/

The next deployment target is Netlify. Supabase remains the persistent authentication/database/storage backend.

## Account model

ResolveRelay currently has two fixed account roles:

- **Consumer** — creates and follows claims, stores product fingerprints, uploads evidence, receives merchant offers, and accepts or declines resolutions.
- **Merchant** — receives claims through secure claim-specific invitations and performs merchant-side actions.

One email cannot be registered as both roles. Consumer accounts cannot be converted into merchant accounts through an invitation.

The current testing registration endpoint accepts a syntactically valid email and password without email confirmation. This is intentionally temporary and will be replaced by the production registration/verification flow later.

## Persistence

Claims and operational data are stored in Supabase PostgreSQL rather than browser session state. Current persisted records include claims, transactions, events, evidence metadata, merchant responses, resolution offers, notifications, memberships, merchants, and product fingerprints.

AI chat history is still browser-local in the current build and is a separate migration item.

## What it does

- Consumers create structured purchase claims and attach evidence.
- Claims remain attached to the consumer account across sign-out/sign-in.
- Merchants enter through a separate secure invitation flow.
- Merchant assignments remain attached to the merchant account.
- Merchant and consumer actions are recorded in a shared history.
- Realtime notifications keep both sides updated.
- AI provides neutral summaries, missing-evidence suggestions, practical next steps, and merchant-message drafting.
- Product URLs can be used to inspect likely support/contact pages on the merchant domain.
- Arabic/RTL and English/LTR are supported.

## WebMCP

ResolveRelay registers structured WebMCP tools through `document.modelContext.registerTool(...)` when the browser supports WebMCP, including claim context/history, notifications, claim submission, merchant invitations, resolution actions, evidence requests, merchant offers, and rejection actions.

State-changing WebMCP tools require explicit human confirmation and still pass through the authorized Supabase backend. WebMCP does not bypass RLS or server-side authorization.

## Architecture

- React + TypeScript + Vite
- Supabase Auth / PostgreSQL / Storage / Realtime / Edge Functions
- AppDeploy backend AI routes in the current recovery build
- WebMCP browser tools
- Chrome extension MVP under `extension/`

The AppDeploy-specific AI/API layer under `backend/` is preserved here as source history. It must be adapted to a Netlify-compatible serverless layer before the AppDeploy dependency is removed from production.

## Repository backup coverage

The repository now contains:

- current frontend application source
- current responsive UI styles
- current AppDeploy backend AI/API source
- Chrome extension MVP
- current authentication/persistence test suite
- current ResolveRelay Supabase Edge Functions
- the complete ResolveRelay-specific Supabase migration chain from initial schema through the latest role and anonymous-access hardening

The hosted Supabase project remains the source of truth for existing production data; data rows and secrets are intentionally not committed to GitHub.

## Security model

- Supabase authentication
- Row Level Security
- registered-account requirement for claim access/writes
- private evidence storage and signed URLs
- separate consumer and merchant identities
- hashed, expiring, revocable merchant invitation tokens
- human confirmation for state-changing agent actions

ResolveRelay is not a law firm and does not provide legal advice.

## Development

```bash
npm install
npm run dev
```

The current source connects to the existing ResolveRelay Supabase backend with a browser-safe Supabase publishable key. Never commit service-role keys, provider API keys, database passwords, or other backend secrets.

## License

Apache-2.0
