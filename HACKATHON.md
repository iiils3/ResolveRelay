# ResolveRelay — WebMCP Challenge Judge Guide

ResolveRelay is a WebMCP-native post-purchase resolution workspace. It gives consumers, merchants, and agents one structured claim record with explicit permissions, a shared state machine, evidence, audit history, and human approval for sensitive actions.

**Live app:** https://resolverelai.netlify.app  
**Source:** https://github.com/iiils3/ResolveRelay

## Challenge timeline

The GitHub repository was created on August 28, 2026, inside the WebMCP Challenge submission period (August 25–September 3, 2026). The implementation and WebMCP work in this repository were created during that window. The public commit history provides the timestamped development record.

## Why this is a strong WebMCP use case

Post-purchase problems are collaborative but stateful. A consumer has purchase facts and evidence; a merchant has actions and resolution authority; an agent can help organize context and move the process forward. Without a structured agent interface, an agent has to infer state from rendered UI, guess what is safe, and repeat information already stored in the application.

ResolveRelay exposes the authoritative claim state through WebMCP. Read tools provide structured context. Write tools are available only for the signed-in role and valid claim state, require explicit human approval, and still pass through the same server-side authorization and state machine as the human UI.

## What people and agents can do together

### Consumer + agent

- Read the exact claim facts and current status.
- Check readiness and missing information.
- Inspect merchant support/contact surfaces from the saved product domain.
- Review claim history and notifications.
- Prepare the next step.
- Submit a ready claim only after the consumer approves.
- Accept or decline a merchant resolution only after the consumer approves.

### Merchant + agent

- Read only claims securely assigned to the merchant account.
- Understand the same event history the consumer sees.
- Request specific evidence only after merchant approval.
- Offer a valid resolution only after merchant approval.
- Reject a claim with a written reason only after merchant approval.

This makes the agent useful without turning it into an authorization bypass.

## Recommended judge test

Use ChatGPT's in-app browser, which supports WebMCP, or Google Chrome 149+ with `chrome://flags/#enable-webmcp-testing` enabled and the browser restarted.

Testing credentials should be taken from the private **Testing Instructions / Credentials** field in the Devpost submission. They are intentionally not committed to this public repository.

### Fast path — about 90 seconds

1. Open the live app and sign in with the provided **consumer** test account.
2. Open the prepared judge claim.
3. Ask the browser agent to **inspect the current ResolveRelay claim and tell me whether it is ready**.
   - Expected tools include `get_case_context` and `get_claim_readiness`.
4. Ask the agent to **submit the claim to the merchant**.
   - The tool should not silently execute. It should require human confirmation first.
5. Confirm the action.
   - The request passes through the authorized Supabase claim state machine and the UI/realtime state updates.

### Merchant path — about 60 seconds

1. Sign in with the provided **merchant** test account and open its assigned judge claim.
2. Ask the agent to summarize the claim history.
3. Ask it to **offer a partial refund** or **request more evidence**.
4. Verify that a write action requires confirmation and that invalid data is blocked server-side.

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

Tool registration is route-, role-, and state-aware. An `AbortSignal` removes stale registrations when React state or navigation changes.

## Server-side trust model

WebMCP does not receive privileged database credentials and cannot bypass authorization.

- Supabase Auth identifies the user.
- Row Level Security limits direct data access.
- Merchant access is granted through a hashed, expiring, single-use claim invitation.
- The `case-action` Edge Function verifies role, membership, allowed state transitions, and an optimistic case version before writes.
- Evidence is private and exposed only through short-lived signed URLs.
- Netlify AI routes require an authenticated registered user.
- Merchant-site fetching rejects private-network destinations and unsafe redirects.
- Model inputs from claims, user text, URLs, and scraped pages are explicitly treated as untrusted data.

## Three-minute demo script

**0:00–0:20 — Problem**  
"A failed purchase usually turns into scattered receipts, messages, support pages, and repeated explanations. ResolveRelay turns that into one structured claim shared by the consumer and merchant."

**0:20–0:45 — Human product experience**  
Show the consumer claim page: purchase facts, evidence, status, transaction passport, history, and merchant invitation/resolution area.

**0:45–1:25 — WebMCP read advantage**  
In the WebMCP-capable browser, ask the agent to inspect the claim and check readiness. Point out that it receives structured claim state directly instead of visually guessing from the UI.

**1:25–1:55 — Human approval**  
Ask the agent to submit the claim. Show the confirmation boundary, approve it, and show the resulting state/history update.

**1:55–2:35 — Merchant collaboration**  
Switch to the merchant test account or a prepared merchant claim. Ask the agent to inspect history and prepare an evidence request or resolution offer. Show that merchant-only tools appear for the merchant and that the write again requires confirmation.

**2:35–2:55 — Why it matters**  
"Humans keep authority; agents get reliable structured tools. Both sides and the agent operate on the same protected claim and audit trail instead of separate chat transcripts or brittle UI automation."

Stop before three minutes.

## Devpost description — ready to adapt

> ResolveRelay turns post-purchase problems into a shared, structured claim where consumers, merchants, and agents can collaborate without giving the agent unchecked authority. WebMCP is a strong fit because the useful context — purchase facts, evidence metadata, claim state, offers, history, and permissions — already lives inside the application. Instead of forcing an agent to visually infer that state from the UI, ResolveRelay exposes explicit role- and state-aware tools through `document.modelContext.registerTool(...)`.
>
> Agents can inspect authorized claim context, check readiness, review history and notifications, and locate merchant support surfaces. They can also help consumers submit claims or respond to resolutions, and help merchants request evidence, offer resolutions, or reject claims. Read tools are marked read-only. State-changing tools require explicit human confirmation and still pass through Supabase Row Level Security and an authorized server-side state machine.
>
> The result is a better human-agent workflow: the agent handles structured context and repetitive coordination while the person retains control over consequential decisions. Consumer, merchant, and agent all operate on the same durable claim and audit trail instead of separate chat transcripts or brittle UI automation.

## Known non-blocking limitations

- AI chat history is browser-local; it is not part of the authoritative claim record.
- Merchant support discovery is best-effort and only reports pages/emails actually found on the merchant domain.
- ResolveRelay provides claim organization and general information, not legal advice.

## Submission checklist

- [x] Public GitHub repository
- [x] Apache-2.0 license file
- [x] WebMCP implemented with `document.modelContext.registerTool(...)`
- [x] Live Netlify deployment
- [x] English README and testing guide
- [x] Runtime dependency audit: zero known production vulnerabilities at finalization time
- [ ] Add private judge credentials to the Devpost submission form
- [ ] Record and publish a public YouTube demo under three minutes
- [ ] Paste/adapt the Devpost text description above
- [ ] Freeze production changes before judging begins
