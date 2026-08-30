# ResolveRelay

**A WebMCP-native post-purchase resolution workspace where consumers, merchants, and AI agents collaborate on the same structured claim without giving the agent unchecked authority.**

**Live app:** https://resolverelai.netlify.app

ResolveRelay turns the messy aftermath of a failed purchase—scattered receipts, support links, messages, deadlines, and refund discussions—into one durable claim record. A consumer can organize the facts and evidence, invite the merchant into the same case, receive resolution offers, and keep a shared audit trail. A WebMCP-capable agent can work with that exact structured state instead of trying to infer intent by visually operating the page.

## Why WebMCP

Post-purchase disputes are a strong WebMCP use case because the useful context already lives in the web application, but traditional browser agents often have to rediscover it from rendered UI and guess which actions are safe.

ResolveRelay exposes the claim as explicit tools. This lets an agent:

- read authorized purchase facts, current status, evidence metadata, pending offers, and case history;
- check whether a claim is ready and identify missing information;
- inspect likely merchant support pages from the saved product domain;
- help a consumer submit a claim or respond to a resolution;
- help a merchant request evidence, offer a resolution, or reject a claim;
- operate against the same server-side state and permissions as the human UI.

The important distinction is that **WebMCP is not an automation bypass**. Read tools are marked read-only and data-bearing tools are marked as potentially untrusted content. State-changing tools are registered only for the correct account role and claim state, request explicit human confirmation, and still execute through the authorized Supabase Edge Function state machine.

## What humans and agents can do together

A consumer can collect the purchase facts and evidence while an agent checks completeness, summarizes the claim neutrally, finds the merchant's support surface, and prepares the next action. The consumer remains responsible for sensitive decisions such as submitting the claim or accepting a merchant resolution.

A merchant sees only claims securely assigned to its account. An agent can understand the same case history and help prepare an evidence request or resolution offer, but the merchant must approve the state-changing action.

Both sides therefore collaborate through one durable claim and one audit trail instead of separate chat transcripts or an agent clicking blindly through an interface.

## WebMCP tool surface

Tools are registered through `document.modelContext.registerTool(...)` only when the browser exposes WebMCP. Registration is tied to the current React route, authenticated role, and claim state, and uses an `AbortSignal` so stale tools are removed when the claim or route changes.

| Tool | Role | Type | Purpose |
| --- | --- | --- | --- |
| `get_case_context` | Consumer / Merchant | Read | Structured facts, status, evidence, requested outcome, offers |
| `get_case_history` | Consumer / Merchant | Read | Authorized audit/event history |
| `get_notifications` | Consumer / Merchant | Read | Recent account notifications |
| `get_claim_readiness` | Consumer / Merchant | Read | Missing core claim facts and evidence readiness |
| `find_merchant_support` | Consumer / Merchant | Read | Inspect likely support/contact pages on the saved merchant domain |
| `create_merchant_invitation` | Consumer | Write | Create a secure expiring merchant invitation |
| `submit_case_to_merchant` | Consumer | Write | Submit a ready claim |
| `accept_resolution` | Consumer | Write | Accept the pending merchant resolution |
| `decline_resolution` | Consumer | Write | Decline the pending merchant resolution |
| `merchant_request_evidence` | Merchant | Write | Request specific additional evidence |
| `merchant_offer_resolution` | Merchant | Write | Offer refund, replacement, or another resolution |
| `merchant_reject_case` | Merchant | Write | Reject with a written reason |

Write tools use two-stage confirmation: an initial call can return `requiresConfirmation`, and execution happens only after the user explicitly approves and the tool is called with `confirmed: true`.

## Core product flow

1. **Consumer account** — create a claim with merchant, order, product, amount, dates, requested resolution, product URL, and description.
2. **Evidence** — attach private image/PDF evidence. Files are stored privately and opened through short-lived signed URLs.
3. **Claim readiness** — see whether the core facts are complete before submission.
4. **Merchant invitation** — create a hashed, expiring, single-use invitation tied to one claim.
5. **Merchant account** — redeem the invitation and gain access only to that assigned case.
6. **Resolution loop** — request more evidence, respond with evidence, offer a resolution, accept/decline, and confirm refund receipt where applicable.
7. **Audit trail + notifications** — preserve actions, actors, state transitions, and read/unread notifications across sessions.
8. **AI assistance** — neutral summaries, missing-evidence checks, next-step guidance, merchant-message drafting, and merchant-support discovery.

Arabic/RTL and English/LTR are both supported.

## Judge testing

The live application can be used in a normal browser. To evaluate WebMCP specifically:

1. Open the live app in **ChatGPT's in-app browser** or **Google Chrome with WebMCP enabled**.
2. Sign in with the testing credentials supplied privately in the Devpost submission, or create an account and complete email confirmation.
3. Open a claim. ResolveRelay registers only the WebMCP tools valid for that account role and current claim state.
4. Ask the agent to inspect the claim context or readiness first.
5. Ask it to perform a write action such as submitting the claim or offering a resolution. The tool should request confirmation before the protected server action executes.

A recommended judge/demo sequence and a sub-three-minute video script are documented in [`HACKATHON.md`](./HACKATHON.md).

## Architecture

```text
Browser / WebMCP agent
        |
        v
React + TypeScript + Vite
        |
        +---- authenticated /api/* ----> Netlify Functions ----> Groq
        |                                      |
        |                                      +---- safe merchant-page inspection
        |
        +---- authenticated data/actions ----> Supabase
                                               |- Auth
                                               |- PostgreSQL + RLS
                                               |- Storage + signed evidence URLs
                                               |- Realtime
                                               `- Edge Functions / claim state machine
```

### Stack

- React 19 + TypeScript + Vite
- Netlify hosting + Functions
- Supabase Auth / PostgreSQL / Storage / Realtime / Edge Functions
- Groq as the primary optional AI provider
- OpenAI-compatible fallback support when configured
- WebMCP imperative browser tools
- Chrome product-fingerprint extension MVP under `extension/`

## Security and trust boundaries

- Claims are account-backed and protected by Supabase Row Level Security.
- Consumer and merchant roles are fixed at account creation.
- A merchant receives a claim only through a hashed, expiring, single-use invitation.
- Sensitive claim transitions are enforced again on the server, including legal state transitions and optimistic version checks.
- Merchant evidence requests and rejections require written messages server-side.
- Partial refunds must be positive and cannot exceed the original purchase amount; the UI enforces the same bound before submission.
- Evidence storage is private; access uses short-lived signed URLs.
- Netlify AI/support routes require a registered Supabase session, reducing anonymous provider-quota abuse.
- Merchant-page fetching validates public destinations and re-validates redirects to prevent private-network SSRF pivots.
- User/claim/merchant website text is treated as untrusted model input and WebMCP content rather than instructions.
- AI provider keys are server-side secrets and are never shipped to the browser.
- Runtime production dependencies reported zero known npm audit vulnerabilities in the finalization check.

ResolveRelay is not a law firm and does not provide legal advice.

## Final validation

Before finalizing the competition branch, the live Supabase backend passed an end-to-end consumer-to-merchant test covering:

- account roles and duplicate-email guard;
- RLS isolation before merchant assignment;
- secure merchant invitation redemption;
- claim submission and merchant view transition;
- resolution offer, acceptance, refund confirmation, and persisted closed state;
- merchant rejection and persisted rejection reason;
- rejection of zero and above-purchase partial refunds;
- valid partial-refund offer and consumer decline;
- persisted audit history across fresh sign-ins.

Temporary QA accounts and claims were removed after the successful run, and the temporary admin testing-registration endpoint was disabled.

## Persistence

The database persists claims, purchase transactions, case events, evidence metadata, merchant responses, resolution offers, notifications, merchant memberships, merchant identities, and product fingerprints. Claims remain available after sign-out/sign-in.

AI chat history is currently browser-local and intentionally separate from the authoritative claim record.

## Local development

Requirements: Node.js 22+.

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

The browser uses a Supabase publishable key. Never commit service-role keys, database passwords, Groq/OpenAI API keys, or other backend secrets.

## Netlify environment

Required primary AI provider:

```text
GROQ_API_KEY=<server-side secret>
```

Optional model override:

```text
GROQ_MODEL=openai/gpt-oss-120b
```

Optional OpenAI-compatible fallback:

```text
OPENAI_API_KEY=<server-side secret>
OPENAI_MODEL=<supported model>
```

## Repository notes

- `main` is the production source of truth.
- `supabase/` contains the ResolveRelay migration chain and active Edge Function source needed to reconstruct the backend behavior.
- Existing production database rows and secrets are intentionally not stored in GitHub.
- Pre-finalization migration and QA scaffolding is retained in Git history/backup branches rather than the final source tree.

ResolveRelay and its WebMCP implementation were built during the WebMCP Challenge submission window.

## License

Apache License 2.0. See [`LICENSE`](./LICENSE).
