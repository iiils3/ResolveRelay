# ResolveRelay — WebMCP Challenge Judge Guide

**Live app:** https://iiils3.github.io/ResolveRelay/  
**Source:** https://github.com/iiils3/ResolveRelay

ResolveRelay is a WebMCP-native post-purchase resolution workspace. Consumers, merchants, and agents operate on one structured claim with explicit permissions, evidence, audit history, notifications, a shared state machine, and human approval for consequential actions.

## Why this is a strong WebMCP use case

Post-purchase problems are collaborative but stateful. A consumer has purchase facts and evidence, a merchant has resolution authority, and an agent can help organize context and move the process forward. Without a structured agent interface, the agent has to infer state from rendered UI, rediscover information already stored in the app, and guess which actions are safe.

ResolveRelay exposes the authoritative claim state through WebMCP. Read tools return structured authorized context. Write tools are registered only for the signed-in role and valid claim state, require explicit human confirmation, and still pass through the same protected Supabase state machine as the human UI.

## What humans and agents can do together

### Consumer + agent

- inspect exact claim facts and current status;
- check readiness and missing information;
- review evidence metadata, contact attempts, history, and notifications;
- inspect merchant support/contact surfaces from the saved product domain;
- prepare the next step;
- submit a claim only after consumer approval;
- accept or decline a merchant resolution only after consumer approval.

### Merchant + agent

- inspect only claims securely assigned to the merchant account;
- understand the same claim history and evidence metadata;
- request additional evidence after merchant approval;
- offer a valid resolution after merchant approval;
- reject with a written reason after merchant approval.

The agent is useful without becoming an authorization bypass.

## WebMCP tool surface

| Tool | Available to | Type |
| --- | --- | --- |
| `get_case_context` | Consumer / Merchant | Read |
| `get_case_history` | Consumer / Merchant | Read |
| `get_notifications` | Consumer / Merchant | Read |
| `get_claim_readiness` | Consumer / Merchant | Read |
| `find_merchant_support` | Consumer / Merchant when a product URL exists | Read |
| `create_merchant_invitation` | Consumer in valid states | Write + confirmation |
| `submit_case_to_merchant` | Consumer when ready | Write + confirmation |
| `accept_resolution` | Consumer with pending offer | Write + confirmation |
| `decline_resolution` | Consumer with pending offer | Write + confirmation |
| `merchant_request_evidence` | Merchant in valid states | Write + confirmation |
| `merchant_offer_resolution` | Merchant in valid states | Write + confirmation |
| `merchant_reject_case` | Merchant in valid states | Write + confirmation |

Tool registration is route-, role-, and state-aware. An `AbortSignal` removes stale registrations when React state or navigation changes. Data-bearing tools mark user/site-derived text as potentially untrusted content.

## Recommended judge test

Use a WebMCP-capable browser environment. Testing credentials belong in the private Devpost testing-instructions field and are intentionally not committed to this public repository.

### Fast consumer path — about 90 seconds

1. Open the live app and sign in with the prepared consumer account.
2. Open the prepared judge claim.
3. Ask: **“Inspect this ResolveRelay claim and tell me whether it is ready.”**
   - Expected tools: `get_case_context`, `get_claim_readiness`.
4. Ask the agent to **submit the claim to the merchant**.
5. Verify that it does not silently execute and instead requires explicit human confirmation.
6. Confirm the action and show the updated state/audit trail.

### Merchant path — about 60 seconds

1. Sign in with the prepared merchant account and open the assigned claim.
2. Ask the agent to summarize the claim history.
3. Ask it to **request more evidence** or **offer a partial refund**.
4. Verify that merchant-only tools are available, write actions require approval, and invalid data is blocked server-side.

## Server-side trust model

WebMCP receives no privileged database credentials.

- Supabase Auth identifies the account.
- Row Level Security limits direct data access.
- Consumer/merchant roles are fixed at signup.
- Merchant claim access comes only through a hashed, expiring, single-use invitation.
- The `case-action` Edge Function verifies role, membership, allowed state transition, and case version before writes.
- Evidence is private and opened through short-lived signed URLs.
- AI requests enter through an authenticated Supabase Edge Function; provider secrets stay server-side.
- Merchant-site fetching rejects private-network destinations and unsafe redirects.
- Claim/user/URL/site text is treated as untrusted model input rather than instructions.

## Three-minute demo script

**0:00–0:20 — Problem**  
“A failed purchase usually becomes scattered receipts, support links, messages, evidence, and repeated explanations. ResolveRelay turns that into one structured claim shared by the consumer and merchant.”

**0:20–0:45 — Human product experience**  
Show the claim: transaction passport, issue type, evidence, contact log, status, readiness, history, and merchant-resolution area.

**0:45–1:25 — WebMCP advantage**  
Ask the agent to inspect the claim and check readiness. Explain that it receives structured authorized state directly instead of visually guessing from the page.

**1:25–1:55 — Human approval boundary**  
Ask the agent to submit the claim. Show the confirmation boundary, approve the action, then show the resulting state/history update.

**1:55–2:35 — Merchant collaboration**  
Switch to the prepared merchant account/claim. Ask the agent to inspect history and request evidence or offer a resolution. Show that merchant-only tools appear only for the merchant and the write again requires approval.

**2:35–2:55 — Why it matters**  
“Humans keep authority; agents get reliable structured tools. Consumer, merchant, and agent operate on the same protected claim and audit trail instead of separate chat transcripts or brittle UI automation.”

Stop before 3:00.

## Devpost description — ready to adapt

> ResolveRelay turns post-purchase problems into a shared structured claim where consumers, merchants, and agents collaborate without giving the agent unchecked authority. WebMCP is a strong fit because the useful context—purchase facts, evidence metadata, contact attempts, claim state, offers, history, notifications, and permissions—already lives inside the web application. Instead of forcing an agent to visually infer that state, ResolveRelay exposes explicit role- and state-aware tools through `document.modelContext.registerTool(...)`.
>
> Agents can inspect authorized claim context, check readiness, review history and notifications, and locate merchant support surfaces. They can also help consumers submit claims or respond to resolutions, and help merchants request evidence, offer resolutions, or reject claims. Read tools are read-only. State-changing tools require explicit human confirmation and still pass through Supabase Row Level Security and a server-side state machine.
>
> The result is a stronger human-agent workflow: the agent handles structured context and repetitive coordination while the person retains control over consequential decisions. Consumer, merchant, and agent all operate on the same durable claim and audit trail rather than separate chat transcripts or brittle UI automation.

## Deployment

The challenge frontend is published from the generated `site` branch through GitHub Pages:

https://iiils3.github.io/ResolveRelay/

`main` is the source of truth. `.github/workflows/publish-static.yml` runs the locked install, typecheck, and Vite production build, then regenerates the artifact-only `site` branch automatically.

The authoritative application backend is Supabase. AI requests enter through an authenticated Supabase Edge Function and remain server-side beyond the browser boundary.

## Validation already completed

The production backend has passed end-to-end tests covering:

- consumer/merchant roles and duplicate-email protection;
- RLS isolation before merchant assignment;
- secure merchant invitation redemption;
- submit -> merchant view -> evidence request -> consumer reply transitions;
- resolution offers, accept/decline, rejection, refund confirmation, and closed state;
- rejection of zero and above-purchase partial refunds;
- persistent audit history across fresh sign-ins.

Temporary QA users/claims were removed after testing and temporary admin registration/self-test endpoints were disabled.

## Known non-blocking limitations

- AI chat history is browser-local and is not part of the authoritative claim record.
- Merchant support discovery is best-effort and only reports surfaces actually found.
- ResolveRelay organizes claims and provides general information; it does not provide legal advice.

## Submission checklist

- [x] Public GitHub repository
- [x] Apache-2.0 license
- [x] WebMCP implemented with `document.modelContext.registerTool(...)`
- [x] Public HTTPS deployment on GitHub Pages
- [x] English README + judge guide
- [x] Role/state-aware write tools with human confirmation
- [x] Server-side authorization/state machine
- [x] Runtime production dependency audit passes at high severity threshold
- [ ] Add private judge credentials to Devpost
- [ ] Record/publish a public demo video under three minutes
- [ ] Paste/adapt the Devpost description above
- [ ] Perform final judge-mode acceptance pass, then freeze production changes
