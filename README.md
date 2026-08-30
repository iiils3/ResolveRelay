# ResolveRelay

**A WebMCP-native post-purchase resolution workspace where consumers, merchants, and AI agents collaborate on one structured claim while humans keep authority over consequential actions.**

**Live app:** https://iiils3.github.io/ResolveRelay/  
**Hackathon judge guide:** [`HACKATHON.md`](./HACKATHON.md)

ResolveRelay turns the messy aftermath of a failed purchase—receipts, product links, support attempts, evidence, merchant replies, refund discussions, and deadlines—into one durable claim record. Consumers and merchants work on the same protected case, while a WebMCP-capable agent receives explicit structured tools instead of visually guessing what the page means.

## Why WebMCP

A post-purchase dispute is stateful, permissioned, and collaborative. The useful context already exists inside the application: purchase facts, claim status, evidence metadata, merchant assignment, offers, contact attempts, notifications, and audit history.

ResolveRelay exposes that state through `document.modelContext.registerTool(...)` so an agent can work with the same authorized claim as the human UI.

The important boundary is that **WebMCP is not an automation bypass**:

- read tools expose only data the signed-in account is authorized to see;
- merchant and consumer tools are registered only for the correct role and claim state;
- stale tools are removed with an `AbortSignal` when route/state changes;
- state-changing tools require explicit human confirmation;
- protected writes still pass through Supabase authorization and the server-side claim state machine;
- user, claim, URL, merchant-site, and scraped text are treated as untrusted content rather than instructions.

## Human + agent workflows

### Consumer

A consumer can:

- create a structured claim from purchase facts;
- categorize the issue (not delivered, wrong item, damaged, refund missing, service not delivered, subscription/recurring charge, not as described, or other);
- upload private evidence;
- keep a transaction passport and merchant-contact log;
- generate a secure merchant invitation;
- receive evidence requests and resolution offers;
- accept/decline offers and confirm a completed refund;
- keep a persistent history and notification trail.

A WebMCP agent can inspect the same authorized context, check readiness, identify missing information, review history/notifications, locate merchant-support surfaces, and prepare the next action.

### Merchant

A merchant receives access only after redeeming a hashed, expiring, single-use invitation tied to one claim. The merchant can inspect the assigned case, request evidence, offer a valid resolution, or reject with a written reason.

Merchant-only WebMCP tools appear only for an authorized merchant and only in valid states.

## WebMCP tool surface

| Tool | Role | Type | Purpose |
| --- | --- | --- | --- |
| `get_case_context` | Consumer / Merchant | Read | Structured claim facts, status, evidence, offers |
| `get_case_history` | Consumer / Merchant | Read | Authorized audit history |
| `get_notifications` | Consumer / Merchant | Read | Recent account notifications |
| `get_claim_readiness` | Consumer / Merchant | Read | Missing facts/evidence and readiness |
| `find_merchant_support` | Consumer / Merchant | Read | Inspect likely support/contact surfaces from the saved merchant domain |
| `create_merchant_invitation` | Consumer | Write + confirmation | Generate an expiring merchant invitation |
| `submit_case_to_merchant` | Consumer | Write + confirmation | Submit a ready claim |
| `accept_resolution` | Consumer | Write + confirmation | Accept the pending offer |
| `decline_resolution` | Consumer | Write + confirmation | Decline the pending offer |
| `merchant_request_evidence` | Merchant | Write + confirmation | Request specific additional evidence |
| `merchant_offer_resolution` | Merchant | Write + confirmation | Offer refund/replacement/other resolution |
| `merchant_reject_case` | Merchant | Write + confirmation | Reject with a written reason |

Write tools use a two-stage confirmation pattern: the first call can return `requiresConfirmation`, and execution occurs only after explicit user approval and a confirmed call.

## Architecture

```text
GitHub Pages
React + TypeScript + Vite
        |
        +---- WebMCP tool registration in the browser
        |
        +---- Supabase Auth / PostgreSQL / RLS / Storage / Realtime
        |          |
        |          +---- case-action Edge Function (authoritative state machine)
        |          +---- invitation / evidence / support functions
        |          +---- authenticated ai-relay Edge Function
        |                         |
        |                         `---- server-side AI provider adapter -> Groq
        |
        `---- private evidence opened through short-lived signed URLs
```

The challenge frontend is served from the repository's generated `site` branch through GitHub Pages. `main` remains the production source of truth; `.github/workflows/publish-static.yml` typechecks/builds `main` and regenerates the artifact-only `site` branch automatically.

The current AI path uses an authenticated Supabase Edge Function as the browser-facing relay and a server-side provider adapter so provider keys are never shipped to the browser. The existing serverless provider adapter is retained as a temporary challenge deployment dependency.

### Stack

- React 19 + TypeScript + Vite
- WebMCP imperative browser tools
- GitHub Pages for the challenge frontend
- Supabase Auth / PostgreSQL / RLS / Storage / Realtime / Edge Functions
- Groq as the primary AI provider behind a server-side adapter
- Chrome product-fingerprint extension MVP under `extension/`

## Security and trust boundaries

- Claims are account-backed and protected by Supabase Row Level Security.
- Consumer and merchant roles are fixed at account creation.
- Anonymous users cannot perform core claim actions.
- Merchant access is granted through a hashed, expiring, single-use invitation.
- Sensitive state transitions are enforced again server-side with role/state checks and optimistic case-version checks.
- Merchant evidence requests and rejections require written messages server-side.
- Partial refunds must be positive and cannot exceed the original purchase amount.
- Evidence storage is private and opened through short-lived signed URLs.
- Merchant-site fetching rejects private-network destinations and re-validates redirects to reduce SSRF risk.
- Claim/user/site content is treated as untrusted model/WebMCP input.
- AI provider secrets remain server-side.
- The final production dependency audit reports zero known high-severity runtime vulnerabilities.

ResolveRelay is not a law firm and does not provide legal advice.

## Persistence and validation

The backend persists claims, transactions, issue types, case events, evidence metadata, contact attempts, merchant responses, resolution offers, notifications, merchant memberships/identities, and product fingerprints.

The production backend passed an end-to-end consumer-to-merchant validation covering:

- account roles and duplicate-email protection;
- RLS isolation before merchant assignment;
- secure merchant invitation redemption;
- claim submission and merchant-view transition;
- evidence-request -> consumer-reply state transition;
- valid/invalid resolution offers;
- rejection of zero and above-purchase partial refunds;
- acceptance, decline, refund confirmation, rejection, and closed state;
- persisted audit history across fresh sign-ins.

Temporary QA accounts/claims were removed after testing and temporary admin registration/self-test endpoints were disabled.

AI chat history is currently browser-local and intentionally separate from the authoritative claim record.

## Judge testing

To evaluate WebMCP, use a browser environment with WebMCP enabled and the private testing credentials supplied in the Devpost submission.

1. Sign in as the prepared consumer and open the judge claim.
2. Ask the agent to inspect the claim and check readiness.
3. Ask it to perform a write action such as submitting the claim.
4. Verify that the action requires human confirmation.
5. Switch to the prepared merchant account and inspect the same assigned claim.
6. Ask for an evidence request or resolution offer and verify role/state-aware tools and confirmation.

The recommended 3-minute sequence and submission copy are in [`HACKATHON.md`](./HACKATHON.md).

## Local development

Requires Node.js 22+.

```bash
npm ci
npm run typecheck
npm run dev
```

Production build:

```bash
npm run typecheck
npm run build
```

Never commit service-role credentials, database passwords, Groq/OpenAI keys, or other backend secrets. The browser intentionally uses only the Supabase publishable key.

## Repository notes

- `main` — production source of truth.
- `site` — generated static artifact branch published by GitHub Pages; do not edit manually.
- `supabase/` — migrations and active Edge Function source required to reconstruct backend behavior.
- `.github/workflows/build.yml` — locked install, typecheck, production build, WebMCP/AI relay checks, runtime dependency audit.
- `.github/workflows/publish-static.yml` — produces and force-publishes the static `site` artifact.

ResolveRelay and its WebMCP implementation were built during the WebMCP Challenge submission window.

## License

Apache License 2.0. See [`LICENSE`](./LICENSE).
