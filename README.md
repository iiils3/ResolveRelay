# ResolveRelay

**A WebMCP-native post-purchase resolution workspace where consumers, merchants, and AI agents collaborate on one structured claim while humans keep authority over consequential actions.**

**Live app:** https://iiils3.github.io/ResolveRelay/  
**WebMCP Challenge guide:** [`HACKATHON.md`](./HACKATHON.md)

ResolveRelay turns the messy aftermath of a failed purchase—receipts, product links, support attempts, evidence, merchant replies, refund discussions, and deadlines—into one durable claim record. Consumers and merchants work on the same protected case, while a WebMCP-capable agent receives explicit structured tools instead of visually guessing what the page means.

## Fast demo access

The challenge deployment intentionally uses a temporary frictionless demo gateway so evaluators do not need to create or verify accounts.

1. Open **Demo access**.
2. Choose **Consumer** or **Merchant**.
3. Enter **any valid email address** and **any non-empty password**.
4. Enter the product immediately.

The typed credentials are not registered as a new user. The selected role maps server-side to one of two **different pre-provisioned Supabase demo identities**. Consumer and merchant therefore remain distinct sessions with real role checks, Row Level Security, claim membership, and server-side authorization. This demo gateway is intentionally temporary and is not the intended public-launch authentication design.

## Why WebMCP

A post-purchase dispute is stateful, permissioned, and collaborative. The useful context already exists inside the application: purchase facts, claim status, evidence metadata, merchant assignment, offers, contact attempts, notifications, and audit history.

ResolveRelay exposes that authorized state through `document.modelContext.registerTool(...)`. The agent does not need to visually scrape the UI or guess which action is currently valid.

WebMCP is deliberately **not an authorization bypass**:

- read tools expose only data the active Supabase identity may read;
- consumer and merchant tools are registered only for the correct role and claim state;
- stale registrations are removed with an `AbortSignal` when route/state changes;
- state-changing tools require explicit human confirmation;
- protected writes still pass through Supabase authorization and the authoritative claim state machine;
- claim, user, URL, and merchant-site text are treated as untrusted content rather than agent instructions.

## Human + agent workflow

### Consumer

The consumer can create a structured claim, upload evidence, keep a transaction passport and merchant-contact log, generate a secure merchant invitation, submit the claim, answer evidence requests, and accept or decline resolution offers.

A WebMCP agent can inspect the same authorized context, check readiness, identify missing information, review history/notifications/contact attempts, locate merchant-support surfaces, and prepare or request the next valid action.

### Merchant

A merchant sees only assigned claims. The merchant can inspect the case, request additional evidence, offer a resolution, or reject with a written reason. Merchant-only WebMCP tools appear only to an authorized merchant and only in valid states.

## WebMCP tool surface

| Tool | Role | Type | Purpose |
| --- | --- | --- | --- |
| `get_case_context` | Consumer / Merchant | Read | Structured claim facts, evidence, offers, state |
| `get_case_history` | Consumer / Merchant | Read | Authorized audit history |
| `get_notifications` | Consumer / Merchant | Read | Recent account notifications |
| `get_contact_log` | Consumer / Merchant | Read | Authorized external-contact history |
| `get_available_actions` | Consumer / Merchant | Read | Valid actions for current role/state |
| `get_claim_readiness` | Consumer / Merchant | Read | Missing facts and readiness |
| `find_merchant_support` | Consumer / Merchant | Read | Verify likely support/contact surfaces on the saved merchant domain |
| `create_merchant_invitation` | Consumer | Write + confirmation | Generate an expiring merchant invitation |
| `submit_case_to_merchant` | Consumer | Write + confirmation | Submit a ready claim |
| `accept_resolution` | Consumer | Write + confirmation | Accept a pending offer |
| `decline_resolution` | Consumer | Write + confirmation | Decline a pending offer |
| `log_contact_attempt` | Consumer | Write + confirmation | Add an external communication event |
| `merchant_request_evidence` | Merchant | Write + confirmation | Request specific evidence |
| `merchant_offer_resolution` | Merchant | Write + confirmation | Offer refund/replacement/other resolution |
| `merchant_reject_case` | Merchant | Write + confirmation | Reject with a written reason |

Write tools use a two-stage confirmation pattern: a call without approval can return `requiresConfirmation`; execution happens only after explicit user approval and a confirmed call.

## Architecture

```text
GitHub Pages
React + TypeScript + Vite
        |
        +---- WebMCP tools in the browser
        |
        +---- Supabase Auth / PostgreSQL / RLS / Storage / Realtime
                   |
                   +---- case-action Edge Function (state machine)
                   +---- merchant invitation / evidence functions
                   +---- demo-login (temporary evaluation gateway)
                   +---- authenticated ai-relay
                                  |
                                  `---- server-side AI adapter -> Groq
```

`main` is the production source of truth. `.github/workflows/publish-static.yml` typechecks/builds `main` and regenerates the artifact-only `site` branch published by GitHub Pages.

The browser never receives the Groq provider key. AI calls require an authenticated Supabase session before the relay forwards them to the server-side adapter. The current challenge adapter uses Groq as its primary provider.

## Security and trust boundaries

- Claims are protected by Supabase Row Level Security.
- Consumer and merchant demo identities are separate; selecting a role never converts one into the other.
- Anonymous users cannot read protected claims or perform claim actions.
- Normal merchant access is granted through a hashed, expiring, single-use invitation.
- Sensitive state transitions are enforced server-side with role/state checks and case-version checks.
- Evidence storage is private and opened through short-lived signed URLs.
- Merchant evidence requests and rejections require written messages server-side.
- Partial refunds must be positive and cannot exceed the purchase amount.
- Merchant-site fetching rejects private-network destinations and re-validates redirects to reduce SSRF risk.
- AI/provider secrets stay server-side.
- Production runtime dependency audit reports zero known high-severity runtime vulnerabilities.

ResolveRelay is not a law firm and does not provide legal advice.

## Validation

Automated and end-to-end checks cover:

- arbitrary demo credentials with **different consumer and merchant sessions**;
- RLS and merchant-membership isolation;
- three prepared claim states for fast evaluation (`ready`, `merchant_viewed`, `resolution_offered`);
- secure invitation redemption and the consumer → merchant workflow;
- evidence-request → consumer-reply transition;
- resolution offers, accept/decline, rejection, refund confirmation, and closed state;
- rejection of zero and above-purchase partial refunds;
- persisted audit history;
- authenticated AI relay returning a live Groq response;
- desktop and mobile live-site acceptance checks.

Temporary QA users/claims and temporary admin self-test endpoints were removed or disabled after testing. The two deliberate demo identities remain for evaluation.

AI chat history is currently browser-local and intentionally separate from the authoritative claim record.

## Judge testing

Use a WebMCP-capable browser such as the supported ChatGPT in-app browser or Chrome with WebMCP enabled.

1. Open **Demo access**, choose **Consumer**, and enter any valid email + any password.
2. Open a prepared claim and ask the agent to inspect context/readiness.
3. Ask for a state-changing action and verify explicit confirmation.
4. Sign out, return to **Demo access**, choose **Merchant**, and again enter any valid email + any password.
5. Open an assigned claim and verify the merchant sees a different role-specific tool surface.

No private test credentials are required. The recommended sub-three-minute sequence is in [`HACKATHON.md`](./HACKATHON.md).

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
- `supabase/` — migrations and reconstructable active Edge Function source.
- `.github/workflows/build.yml` — locked install, typecheck, build, WebMCP/relay presence checks, runtime dependency audit.
- `.github/workflows/publish-static.yml` — produces and publishes the static `site` artifact.

ResolveRelay and its WebMCP implementation were built during the WebMCP Challenge submission window.

## License

Apache License 2.0. See [`LICENSE`](./LICENSE).
