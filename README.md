# ResolveRelay

ResolveRelay turns a post-purchase problem into a structured claim between a consumer and a merchant, with durable account-backed claims, evidence, secure merchant invitations, realtime updates, human-approved actions, optional AI assistance, merchant-support discovery, and WebMCP tools.

## Deployment

The repository is now named **`iiils3/ResolveRelay`** and is the source of truth for the project.

The application has been migrated away from AppDeploy for its active runtime path and is prepared for Netlify:

- Vite frontend builds to `dist/`
- Netlify Functions live under `netlify/functions/`
- `netlify.toml` contains the build and functions configuration
- AI routes read `OPENAI_API_KEY` only from Netlify environment variables
- Supabase remains the persistent authentication/database/storage backend

Historical AppDeploy backend source under `backend/` is retained only as migration history and is not the intended Netlify runtime.

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
- Netlify hosting + Netlify Functions
- Supabase Auth / PostgreSQL / Storage / Realtime / Edge Functions
- OpenAI API for optional claim assistance
- WebMCP browser tools
- Chrome extension MVP under `extension/`

## Repository coverage

The repository contains:

- current frontend application source
- current responsive UI styles
- Netlify serverless API layer
- Chrome extension MVP
- authentication/persistence tests
- ResolveRelay Supabase Edge Functions
- the ResolveRelay Supabase migration chain from initial schema through role and anonymous-access hardening
- historical pre-Netlify backend source for reference

The hosted Supabase project remains the source of truth for existing production data; data rows and secrets are intentionally not committed to GitHub.

## Security model

- Supabase authentication
- Row Level Security
- registered-account requirement for claim access/writes
- private evidence storage and signed URLs
- separate consumer and merchant identities
- hashed, expiring, revocable merchant invitation tokens
- human confirmation for state-changing agent actions
- provider API keys stored only as server-side environment variables

ResolveRelay is not a law firm and does not provide legal advice.

## Development

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The browser uses the existing ResolveRelay Supabase project through a browser-safe publishable key. Never commit service-role keys, OpenAI API keys, database passwords, or other backend secrets.

## Netlify environment

Required for AI features:

```text
OPENAI_API_KEY=<server-side secret>
```

Optional:

```text
OPENAI_MODEL=gpt-5-mini
```

## License

Apache-2.0
