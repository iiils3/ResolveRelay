# ResolveRelay — WebMCP Challenge submission copy

> Ready-to-paste English material for the Devpost submission. Keep the submitted repository and live deployment unchanged after the submission deadline while judging is in progress.

## One-line pitch

ResolveRelay turns fragmented post-purchase communication into a shared, permissioned coordination workspace where consumers, merchants, and WebMCP agents work from the same structured state while humans retain approval over consequential actions.

## What it does

A failed purchase usually scatters context across receipts, product pages, screenshots, support chats, refund promises, and follow-ups. ResolveRelay keeps those facts in one durable claim record. A consumer can create a claim, attach evidence, record merchant contact attempts, invite the merchant securely, and track offers and outcomes. An assigned merchant can review the same protected claim, request specific evidence, offer a resolution, or reject with a written reason.

The app also exposes the authorized claim state through WebMCP. Instead of visually scraping the page, an agent can directly read structured purchase facts, readiness, evidence metadata, notifications, contact history, the audit timeline, follow-up state, and a canonical claim dossier. The set of write tools changes with the signed-in role and claim state.

## Why WebMCP is a strong fit

This problem is not a one-shot chatbot prompt. It is a stateful workflow with two parties, changing permissions, evidence, deadlines/checkpoints, and actions that can affect money or a dispute outcome.

WebMCP gives an agent an explicit contract with the web app:

- structured tools replace brittle visual UI guessing;
- tools are registered dynamically for the active role and claim state;
- read tools return the same authorized state the human sees;
- state-changing tools use a two-step human-confirmation pattern;
- all protected writes still pass through server-side authorization and the claim state machine;
- untrusted claim and merchant-site text is treated as data, not as agent instructions.

The result is a better human-agent experience than either a normal form workflow or a generic chat assistant alone.

## What people and agents can do together

A consumer can ask an agent to inspect the current claim, identify missing facts, summarize the history, check whether a merchant follow-up checkpoint has been reached, find likely support surfaces on the merchant domain, and prepare the next valid action. The human decides whether a consequential action should happen.

A merchant receives a different tool surface. The agent can inspect only claims assigned to that merchant and can propose actions that are valid in the current state, such as requesting evidence, offering a resolution, or rejecting with a reason. The human must explicitly confirm before the tool performs a state-changing action.

Both sides therefore collaborate with agents against one protected source of truth instead of copying data between chat, email, forms, and dashboards.

## WebMCP implementation

ResolveRelay uses the imperative WebMCP API through `document.modelContext.registerTool(...)`.

Representative read tools:

- `get_case_context`
- `get_case_history`
- `get_notifications`
- `get_contact_log`
- `get_available_actions`
- `get_claim_readiness`
- `get_follow_up_status`
- `get_claim_dossier`
- `find_merchant_support` when a merchant URL is available

Representative consumer write tools:

- `log_contact_attempt`
- `create_merchant_invitation`
- `submit_case_to_merchant`
- `accept_resolution`
- `decline_resolution`

Representative merchant write tools:

- `merchant_request_evidence`
- `merchant_offer_resolution`
- `merchant_reject_case`

Registrations are removed with an `AbortSignal` when the active claim/session changes. Consequential tools return a `requiresConfirmation` response unless the user has explicitly approved the confirmed invocation.

## Complete product experience

ResolveRelay is more than a WebMCP proof of concept. The working challenge build includes:

- separate consumer and merchant demo identities;
- Supabase authentication, PostgreSQL, Row Level Security, and role isolation;
- a claim state machine enforced by server-side Edge Functions;
- private evidence storage with short-lived signed URLs;
- secure expiring merchant invitations;
- realtime in-app notifications;
- transaction passports and product fingerprints;
- merchant contact logs and best-effort merchant support discovery;
- AI-assisted claim summaries and drafting behind an authenticated relay;
- resolution offers with partial-refund validation;
- a neutral printable Claim Dossier / save-as-PDF view;
- an internal 72-hour workflow follow-up checkpoint that is explicitly not a legal deadline or automatic escalation;
- English and Arabic UI;
- responsive desktop/mobile layouts.

ResolveRelay does not present itself as a law firm and does not claim that its dossier is an official bank or government form.

## Potential impact

The target audience is a consumer with a legitimate post-purchase problem and the merchant trying to resolve it before the situation turns into a fragmented support thread or payment dispute. ResolveRelay is not a third-party adjudicator: it does not decide who is right, guarantee either party's claims, or replace the merchant's support authority. Its job is coordination—collecting facts once, keeping evidence together, showing who is waiting on whom, and giving both parties one shared record on which to act.

ResolveRelay makes that coordination legible to both humans and agents. WebMCP is especially useful because an agent can act on structured state without bypassing the application’s permissions or forcing the user to surrender control over consequential decisions.

## Creativity and ambition

Most dispute assistants stop at generating a complaint letter or answering questions. ResolveRelay treats a dispute as a shared human-agent protocol: two protected roles, one evolving claim state, role-aware agent tools, explicit human approval, merchant participation, evidence, offers, and an audit trail.

The ambition is not to replace either party with AI. It is to make the web workflow itself agent-native while preserving human authority and server-side trust boundaries.

## Live app and source

- Live app: https://resolverelay-recovery-gxngvu.v2.appdeploy.ai/
- Public source: https://github.com/iiils3/ResolveRelay
- License: Apache-2.0

## Judge testing instructions

1. Open the live app in ChatGPT’s in-app browser or Chrome with WebMCP enabled.
2. Select **Demo access**.
3. Choose **Consumer**, then enter any syntactically valid email address and any non-empty password. The typed values are only a frictionless evaluation form; they are not registered as a new account.
4. Open **Refund not received** to see a prepared claim with a pending merchant resolution offer.
5. Inspect the registered WebMCP tools. Read tools should include claim context/history/readiness/dossier; the consumer tool surface should also include the state-valid offer actions.
6. Invoke a consequential tool without confirmation and verify that it requests explicit human confirmation instead of changing state.
7. Sign out, return to **Demo access**, choose **Merchant**, and again enter any valid email + any password.
8. Open **Order not delivered** or **Wrong item received**. The merchant receives a different role-specific WebMCP tool surface with request-evidence / offer-resolution / reject actions and no consumer-only write tools.
9. Review the Human + Agent Workspace, Follow-up clock, Claim Dossier, evidence/history, and merchant action UI.

No private credentials are required for evaluation.

## Submission checklist

- [x] Working public live URL
- [x] Public source repository
- [x] Detectable open-source license
- [x] WebMCP implementation in source
- [x] English project description and testing instructions
- [x] Challenge-period commit history
- [ ] Record the final demo on the frozen live build
- [ ] Upload a public YouTube video shorter than 3 minutes with audio
- [ ] Add the YouTube URL to Devpost
- [ ] Re-run the final live judge checklist immediately before submission
- [ ] Submit before the official deadline
- [ ] After the deadline, freeze the submitted repo/live build during the judging period
