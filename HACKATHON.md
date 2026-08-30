# ResolveRelay — WebMCP Challenge Judge Guide

**Live app:** https://iiils3.github.io/ResolveRelay/  
**Source:** https://github.com/iiils3/ResolveRelay

ResolveRelay is a WebMCP-native post-purchase resolution workspace. Consumers, merchants, and agents operate on one structured claim with explicit permissions, evidence, audit history, notifications, a shared state machine, and human approval for consequential actions.

## Zero-friction evaluation access

No signup, email verification, or private credentials are required for the challenge deployment.

1. Open **Demo access**.
2. Choose **Consumer** or **Merchant**.
3. Enter **any valid email address** and **any non-empty password**.
4. Continue immediately.

The entered values are not used to create an account. The selected role maps server-side to one of two different pre-provisioned Supabase identities, so Consumer and Merchant still have separate sessions, RLS permissions, memberships, dashboards, and WebMCP tool surfaces. This gateway is temporary for evaluation and is intentionally not the planned public-launch authentication model.

## Why this is a strong WebMCP use case

Post-purchase problems are collaborative but stateful. A consumer has purchase facts and evidence, a merchant has resolution authority, and an agent can help organize context and move the process forward. Without a structured agent interface, the agent has to infer state from rendered UI, rediscover information already stored in the app, and guess which actions are allowed.

ResolveRelay exposes the authorized claim state directly through WebMCP. Read tools return structured context. Write tools are registered only for the active role and valid claim state, require explicit human confirmation, and still pass through the same protected Supabase state machine as the human UI.

The result is not “AI chat beside a form.” The agent becomes a permission-aware participant in a real two-party workflow while the human remains the authority for consequential decisions.

## Human + agent collaboration

### Consumer + agent

- inspect exact purchase/claim facts and current state;
- check readiness and missing information;
- review evidence metadata, contact attempts, history, and notifications;
- inspect likely support/contact surfaces on the saved merchant domain;
- create a merchant invitation or submit a ready claim only after approval;
- accept or decline a pending resolution only after approval;
- record an external support contact with explicit confirmation.

### Merchant + agent

- inspect only claims assigned to the merchant identity;
- understand the same authorized history and evidence metadata;
- request additional evidence after approval;
- offer a valid refund/replacement/other resolution after approval;
- reject with a written reason after approval.

The agent is useful without becoming an authorization bypass.

## WebMCP tool surface

| Tool | Available to | Type |
| --- | --- | --- |
| `get_case_context` | Consumer / Merchant | Read |
| `get_case_history` | Consumer / Merchant | Read |
| `get_notifications` | Consumer / Merchant | Read |
| `get_contact_log` | Consumer / Merchant | Read |
| `get_available_actions` | Consumer / Merchant | Read |
| `get_claim_readiness` | Consumer / Merchant | Read |
| `find_merchant_support` | Consumer / Merchant when product URL exists | Read |
| `create_merchant_invitation` | Consumer in valid states | Write + confirmation |
| `submit_case_to_merchant` | Consumer when ready | Write + confirmation |
| `accept_resolution` | Consumer with pending offer | Write + confirmation |
| `decline_resolution` | Consumer with pending offer | Write + confirmation |
| `log_contact_attempt` | Consumer | Write + confirmation |
| `merchant_request_evidence` | Merchant in valid states | Write + confirmation |
| `merchant_offer_resolution` | Merchant in valid states | Write + confirmation |
| `merchant_reject_case` | Merchant in valid states | Write + confirmation |

Tool registration is route-, role-, and state-aware. An `AbortSignal` removes stale registrations when the active claim/state changes. Data-bearing read tools flag user/site-derived content as untrusted. Protected writes are checked again on the server.

## Potential impact — grounded, not hypothetical scale claims

ResolveRelay does not claim that every return becomes a dispute. The scale of post-purchase coordination is nevertheless large:

- The National Retail Federation's **2025 Retail Returns Landscape** projected **$849.9 billion** in total U.S. retail returns for 2025 and estimated **19.3% of online sales** would be returned. Source: https://nrf.com/research/2025-retail-returns-landscape
- FTC consumer guidance for a problem with a purchase explicitly recommends going back to the store/site first, being ready with **receipts and documentation**, explaining the problem, and stating the desired outcome such as refund, repair, exchange, or store credit. Source: https://consumer.ftc.gov/consumer-alerts/2025/02/have-problem-something-you-bought

ResolveRelay targets that coordination layer: preserve the purchase facts, evidence and contact trail once; give both sides a shared state; and let an agent work on the structured record instead of repeatedly reconstructing the dispute from screenshots and chat history.

This benefits consumers through clarity and continuity, and merchants through more structured incoming claims, explicit requested outcomes, evidence context, and a single audit trail.

## Recommended judge test

Use ChatGPT's supported in-app browser or Chrome with WebMCP enabled.

### Consumer path — ~80 seconds

1. Open **Demo access → Consumer** and type any valid email + any password.
2. Open a prepared claim in `ready` state.
3. Ask: **“Inspect this ResolveRelay claim and tell me whether it is ready.”**
   - Expected tools: `get_case_context`, `get_claim_readiness`.
4. Ask the agent to **submit the claim to the merchant**.
5. Verify that execution requires explicit human confirmation.
6. Show the updated state/audit trail.

### Merchant path — ~55 seconds

1. Sign out and use **Demo access → Merchant**, again with any valid email + any password.
2. Open an assigned claim.
3. Ask the agent to inspect history/available actions.
4. Ask it to **request more evidence** or **offer a partial refund**.
5. Verify that merchant-only tools are present, write actions require approval, and invalid amounts are rejected server-side.

### Resolution path — ~25 seconds

1. Return as Consumer.
2. Open the prepared `resolution_offered` claim.
3. Ask what actions are currently available.
4. Demonstrate that accept/decline tools exist only in that state and remain confirmation-gated.

## Server-side trust model

WebMCP receives no privileged database credentials.

- Supabase Auth identifies the active demo or normal identity.
- Row Level Security limits direct data access.
- Consumer and merchant identities remain separate roles.
- Normal merchant claim access comes through a hashed, expiring, single-use invitation.
- `case-action` verifies role, membership, allowed transition, and case version before writes.
- Evidence is private and opened through short-lived signed URLs.
- AI requests require an authenticated Supabase session; provider credentials remain server-side.
- Merchant-site fetching rejects private-network destinations and re-validates redirects.
- Claim/user/URL/site text is treated as untrusted model input rather than instructions.

The temporary demo gateway is deliberately isolated from claim authorization: it only chooses one of two pre-provisioned evaluation identities. It does not grant arbitrary roles to arbitrary Supabase users.

## Three-minute video script

**0:00–0:18 — Problem**  
“A failed purchase quickly becomes scattered receipts, support links, messages, evidence, and repeated explanations. ResolveRelay turns that into one structured claim shared by the consumer and merchant.”

**0:18–0:38 — Human product**  
Use Demo access as Consumer. Show the transaction passport, issue, evidence/contact history, status, readiness, and audit trail.

**0:38–1:18 — WebMCP leverage**  
Ask the agent to inspect the claim and check readiness. Explain that WebMCP gives the agent structured authorized state directly instead of forcing it to infer meaning from the rendered page.

**1:18–1:45 — Human approval boundary**  
Ask the agent to submit the claim. Show the confirmation boundary, approve it, then show the state/history update.

**1:45–2:25 — Merchant collaboration**  
Switch to Merchant using any demo credentials. Open an assigned claim. Ask the agent for available actions and request evidence or offer a resolution. Point out that merchant-only tools appear because role and claim state changed.

**2:25–2:50 — Why it matters**  
“Humans keep authority; agents get reliable structured tools. Consumer, merchant, and agent operate on the same protected claim and audit trail instead of separate chat transcripts or brittle UI automation.”

**2:50–2:57 — Close**  
“ResolveRelay is a small example of an open web where agents can collaborate with people inside real application rules, not around them.”

Stop before 3:00.

## Devpost description — ready to adapt

> ResolveRelay turns post-purchase problems into a shared structured claim where consumers, merchants, and agents collaborate without giving the agent unchecked authority. WebMCP is a strong fit because the useful context—purchase facts, evidence metadata, contact attempts, claim state, offers, history, notifications, and permissions—already lives inside the web application. Instead of forcing an agent to visually infer that state, ResolveRelay exposes explicit role- and state-aware tools through `document.modelContext.registerTool(...)`.
>
> Agents can inspect authorized claim context, check readiness, review history and notifications, locate merchant support surfaces, and understand which actions are currently valid. They can also help consumers submit claims or respond to resolutions, and help merchants request evidence, offer resolutions, or reject claims. State-changing tools require explicit human confirmation and still pass through Supabase Row Level Security and a server-side state machine.
>
> The result is a stronger human-agent workflow: the agent handles structured context and repetitive coordination while the person retains control over consequential decisions. Consumer, merchant, and agent all operate on the same durable claim and audit trail rather than separate chat transcripts or brittle UI automation.

## Deployment

The challenge frontend is generated from `main` and published from the artifact-only `site` branch through GitHub Pages:

https://iiils3.github.io/ResolveRelay/

The authoritative data/state backend is Supabase. AI requests enter through an authenticated Supabase relay and reach a server-side adapter using Groq as the current primary provider; the browser never receives the provider key.

## Validation completed

The backend and live deployment are tested for:

- arbitrary entered demo credentials while preserving separate consumer/merchant identities;
- role correctness and RLS isolation;
- prepared `ready`, `merchant_viewed`, and `resolution_offered` states;
- invitation redemption and merchant assignment;
- submit → merchant view → evidence request → consumer reply transitions;
- valid/invalid resolution offers;
- zero and above-purchase partial-refund rejection;
- accept/decline, rejection, refund confirmation, and closed state;
- persistent audit history;
- authenticated AI relay returning a live Groq response;
- desktop/mobile live-site behavior.

Temporary QA users/claims and temporary admin registration/self-test endpoints were removed or disabled. Only the deliberate two-role demo fixtures remain.

## Known non-blocking limitations

- AI chat history is browser-local and is not part of the authoritative claim record.
- Merchant support discovery is best-effort and only reports surfaces actually found.
- The frictionless `demo-login` gateway is challenge-only and must be removed/replaced before public launch.
- ResolveRelay organizes claims and provides general information; it does not provide legal advice.

## Submission checklist

- [x] Public GitHub repository
- [x] Apache-2.0 license detected by GitHub
- [x] WebMCP implemented with `document.modelContext.registerTool(...)`
- [x] Public HTTPS deployment on GitHub Pages
- [x] Zero-friction role-separated demo access
- [x] English README + judge guide
- [x] Role/state-aware tools with human confirmation
- [x] Server-side authorization/state machine
- [x] Runtime production dependency audit passes at high severity threshold
- [x] Live authenticated Groq response verified
- [ ] Record/publish a public YouTube demo under three minutes
- [ ] Paste/adapt the Devpost description above
- [ ] Perform final strict judge-mode pass, then freeze production changes
