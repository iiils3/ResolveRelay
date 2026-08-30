const SUPABASE_URL = 'https://mbhiaqhlhxjibuckdikq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AEzTVMOcLg26Q6ZoRw62Dw_jtOCDGCI';
const RUN = `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
const consumerEmail = `qa.consumer.${RUN}@example.com`;
const merchantEmail = `qa.merchant.${RUN}@example.com`;
const password = `ResolveRelay-QA-${RUN}!`;

const log = (name, data = '') => console.log(`QA ${name}${data === '' ? '' : `: ${typeof data === 'string' ? data : JSON.stringify(data)}`}`);
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function raw(path, { method = 'GET', token, body, headers = {} } = {}) {
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_KEY,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  let data = text;
  try { data = text ? JSON.parse(text) : null; } catch {}
  return { response, data, text };
}

async function fn(name, body, token, { expectError = false } = {}) {
  const { response, data, text } = await raw(`/functions/v1/${name}`, {
    method: 'POST', token: token || SUPABASE_KEY, body,
  });
  if (expectError) {
    assert(!response.ok || data?.error, `${name} unexpectedly succeeded`);
    return data;
  }
  assert(response.ok, `${name} failed (${response.status}): ${text}`);
  assert(!data?.error, `${name} returned error: ${data.error}`);
  return data;
}

async function register(email, role, name) {
  const data = await fn('test-register', { email, password, role, name }, null);
  assert(data?.ok === true && data?.userId, `registration failed for ${role}`);
  return data.userId;
}

async function signIn(email) {
  const { response, data, text } = await raw('/auth/v1/token?grant_type=password', {
    method: 'POST', body: { email, password },
  });
  assert(response.ok, `sign-in failed for ${email}: ${text}`);
  assert(data?.access_token && data?.user?.id, `missing access token for ${email}`);
  return data;
}

async function rpcCreateCase(token, suffix, requested = 'full_refund') {
  const payload = {
    consumer_name: 'Production QA Consumer',
    merchant_name: 'Production QA Merchant',
    product_service: `QA Product ${suffix}`,
    product_url: 'https://example.com/products/qa',
    amount: '125.50',
    currency: 'USD',
    order_id: `QA-${RUN}-${suffix}`,
    purchase_date: '2026-08-20',
    promised_delivery_date: '2026-08-25',
    description: `Production E2E ${suffix}: item not delivered`,
    requested_resolution: requested,
  };
  const { response, data, text } = await raw('/rest/v1/rpc/create_consumer_case', {
    method: 'POST', token, body: { case_input: payload },
  });
  assert(response.ok, `create_consumer_case failed: ${text}`);
  const id = typeof data === 'string' ? data : data?.id || data;
  assert(typeof id === 'string' && id.length > 20, `invalid case id: ${text}`);
  return id;
}

async function select(token, table, query) {
  const { response, data, text } = await raw(`/rest/v1/${table}?${query}`, { token });
  assert(response.ok, `select ${table} failed: ${text}`);
  assert(Array.isArray(data), `select ${table} did not return rows`);
  return data;
}

async function caseAction(token, caseId, action, payload = {}, opts = {}) {
  return fn('case-action', { caseId, action, payload }, token, opts);
}

async function inviteAndAssign(consumerToken, merchantToken, caseId, { verifyIsolation = false } = {}) {
  if (verifyIsolation) {
    const beforeMerchant = await select(merchantToken, 'cases', `id=eq.${caseId}&select=id,status`);
    assert(beforeMerchant.length === 0, 'RLS failure: unassigned merchant can read consumer case');
    const anon = await select(undefined, 'cases', `id=eq.${caseId}&select=id,status`);
    assert(anon.length === 0, 'RLS failure: anonymous client can read consumer case');
  }

  const invitation = await fn('merchant-invite', { caseId }, consumerToken);
  assert(typeof invitation?.path === 'string' && invitation.path.includes('/invite/'), 'merchant invitation path missing');
  const token = invitation.path.split('/').pop();

  if (verifyIsolation) {
    const wrongRole = await fn('redeem-invite', { token }, consumerToken, { expectError: true });
    assert(String(wrongRole?.error || '').toLowerCase().includes('merchant'), 'consumer was not rejected from merchant invitation');
  }

  const submitted = await caseAction(consumerToken, caseId, 'submit', { label: 'QA submitted claim' });
  assert(submitted.status === 'submitted', 'claim did not transition to submitted');

  const redeemed = await fn('redeem-invite', { token }, merchantToken);
  assert(redeemed.caseId === caseId, 'merchant invite redeemed to wrong case');

  const afterMerchant = await select(merchantToken, 'cases', `id=eq.${caseId}&select=id,status,merchant_id`);
  assert(afterMerchant.length === 1, 'assigned merchant cannot read case');

  const viewed = await caseAction(merchantToken, caseId, 'view', { label: 'QA merchant viewed claim' });
  assert(viewed.status === 'merchant_viewed', 'merchant view transition failed');
}

async function freshCaseStatus(email, caseId) {
  const session = await signIn(email);
  const rows = await select(session.access_token, 'cases', `id=eq.${caseId}&select=id,status,version,merchant_id`);
  assert(rows.length === 1, 'case not visible after fresh sign-in');
  return rows[0];
}

async function main() {
  log('run', RUN);
  log('consumer_email', consumerEmail);
  log('merchant_email', merchantEmail);

  const consumerId = await register(consumerEmail, 'consumer', 'Production QA Consumer');
  const merchantId = await register(merchantEmail, 'merchant', 'Production QA Merchant');
  log('consumer_id', consumerId);
  log('merchant_id', merchantId);

  const duplicate = await fn('test-register', { email: consumerEmail, password, role: 'merchant', name: 'Duplicate QA' }, null, { expectError: true });
  assert(duplicate?.error === 'EMAIL_ALREADY_REGISTERED', 'same email was allowed to register twice');
  log('duplicate_email_guard', 'pass');

  let consumer = await signIn(consumerEmail);
  let merchant = await signIn(merchantEmail);
  assert(consumer.user.id === consumerId, 'consumer sign-in user mismatch');
  assert(merchant.user.id === merchantId, 'merchant sign-in user mismatch');
  log('auth_roles', 'pass');

  // Scenario A: merchant offers full refund, consumer accepts, then confirms receipt.
  const caseA = await rpcCreateCase(consumer.access_token, 'ACCEPT');
  log('case_accept', caseA);
  await inviteAndAssign(consumer.access_token, merchant.access_token, caseA, { verifyIsolation: true });

  const offered = await caseAction(merchant.access_token, caseA, 'offer', {
    kind: 'full_refund', currency: 'USD', note: 'QA full refund', label: 'QA full refund offered',
  });
  assert(offered.status === 'resolution_offered', 'offer transition failed');

  const consumerNotifications = await select(consumer.access_token, 'notifications', `case_id=eq.${caseA}&select=id,type,title`);
  assert(consumerNotifications.some(n => n.type === 'offer'), 'consumer did not receive offer notification');

  const accepted = await caseAction(consumer.access_token, caseA, 'accept_offer', { label: 'QA offer accepted' });
  assert(accepted.status === 'resolved', 'accept offer did not resolve case');
  let persistedA = await freshCaseStatus(consumerEmail, caseA);
  assert(persistedA.status === 'resolved', 'resolved status did not persist across fresh login');

  consumer = await signIn(consumerEmail);
  const confirmed = await caseAction(consumer.access_token, caseA, 'confirm_refund', { label: 'QA refund received' });
  assert(confirmed.status === 'closed', 'refund confirmation did not close case');
  persistedA = await freshCaseStatus(consumerEmail, caseA);
  assert(persistedA.status === 'closed', 'closed status did not persist');
  const offersA = await select((await signIn(consumerEmail)).access_token, 'resolution_offers', `case_id=eq.${caseA}&select=id,kind,status,refund_received_at`);
  assert(offersA.length === 1 && offersA[0].status === 'accepted' && offersA[0].refund_received_at, 'accepted refund offer was not persisted correctly');
  log('scenario_accept_close', 'pass');

  // Scenario B: merchant rejects a separate claim.
  consumer = await signIn(consumerEmail);
  merchant = await signIn(merchantEmail);
  const caseB = await rpcCreateCase(consumer.access_token, 'REJECT');
  log('case_reject', caseB);
  await inviteAndAssign(consumer.access_token, merchant.access_token, caseB);
  const rejected = await caseAction(merchant.access_token, caseB, 'reject', { message: 'QA rejection reason', label: 'QA merchant rejected claim' });
  assert(rejected.status === 'rejected', 'merchant rejection transition failed');
  const persistedB = await freshCaseStatus(consumerEmail, caseB);
  assert(persistedB.status === 'rejected', 'rejected status did not persist');
  const responsesB = await select((await signIn(consumerEmail)).access_token, 'merchant_responses', `case_id=eq.${caseB}&select=id,response_type,message`);
  assert(responsesB.length === 1 && responsesB[0].response_type === 'rejection', 'merchant rejection response missing');
  log('scenario_reject', 'pass');

  // Scenario C: invalid partial refund is blocked; valid offer can be declined.
  consumer = await signIn(consumerEmail);
  merchant = await signIn(merchantEmail);
  const caseC = await rpcCreateCase(consumer.access_token, 'DECLINE', 'partial_refund');
  log('case_decline', caseC);
  await inviteAndAssign(consumer.access_token, merchant.access_token, caseC);
  const invalidOffer = await caseAction(merchant.access_token, caseC, 'offer', { kind: 'partial_refund', amount: 0, currency: 'USD' }, { expectError: true });
  assert(String(invalidOffer?.error || '').toLowerCase().includes('positive amount'), 'zero partial refund was not rejected');
  const validOffer = await caseAction(merchant.access_token, caseC, 'offer', { kind: 'partial_refund', amount: 25, currency: 'USD', note: 'QA partial refund' });
  assert(validOffer.status === 'resolution_offered', 'valid partial refund offer failed');
  const declined = await caseAction(consumer.access_token, caseC, 'decline_offer', { label: 'QA consumer declined offer' });
  assert(declined.status === 'submitted', 'declined offer did not return case to submitted');
  const offersC = await select(consumer.access_token, 'resolution_offers', `case_id=eq.${caseC}&select=id,kind,amount,status`);
  assert(offersC.length === 1 && offersC[0].status === 'declined' && Number(offersC[0].amount) === 25, 'declined offer persistence failed');
  const persistedC = await freshCaseStatus(consumerEmail, caseC);
  assert(persistedC.status === 'submitted', 'declined-offer case state did not persist');
  log('scenario_decline', 'pass');

  const eventsA = await select((await signIn(consumerEmail)).access_token, 'case_events', `case_id=eq.${caseA}&select=id,event_type,actor_role`);
  assert(eventsA.some(e => e.event_type === 'case_prepared') && eventsA.some(e => e.event_type === 'offer') && eventsA.some(e => e.event_type === 'accept_offer') && eventsA.some(e => e.event_type === 'confirm_refund'), 'case audit history is incomplete');
  log('audit_history', 'pass');

  console.log('QA_RESULT=' + JSON.stringify({
    ok: true,
    run: RUN,
    consumerEmail,
    merchantEmail,
    consumerId,
    merchantId,
    cases: { accept: caseA, reject: caseB, decline: caseC },
  }));
}

main().catch(error => {
  console.error('QA_RESULT=' + JSON.stringify({ ok: false, run: RUN, consumerEmail, merchantEmail, error: error?.message || String(error) }));
  process.exit(1);
});
