import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const SITE = 'https://resolverelai.netlify.app';
const SUPABASE_URL = 'https://mbhiaqhlhxjibuckdikq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_AEzTVMOcLg26Q6ZoRw62Dw_jtOCDGCI';
const RUN = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const consumerEmail = `uiqa.consumer.${RUN}@example.com`;
const merchantEmail = `uiqa.merchant.${RUN}@example.com`;
const password = `ResolveRelay-UIQA-${RUN}!`;

const assert = (ok, message) => { if (!ok) throw new Error(message); };
const log = (name, value='pass') => console.log(`UIQA ${name}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);

async function raw(path, { method='GET', token, body }={}) {
  const r = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: { apikey: SUPABASE_KEY, ...(token ? { Authorization:`Bearer ${token}` } : {}), ...(body!==undefined ? {'Content-Type':'application/json'} : {}) },
    body: body===undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  let data = text; try { data = text ? JSON.parse(text) : null; } catch {}
  return { r, data, text };
}
async function fn(name, body, token) {
  const {r,data,text} = await raw(`/functions/v1/${name}`, {method:'POST',token:token||SUPABASE_KEY,body});
  assert(r.ok && !data?.error, `${name} failed: ${text}`); return data;
}
async function register(email, role) { return fn('test-register',{email,password,role,name:role==='consumer'?'UI QA Consumer':'UI QA Merchant'}); }
async function signIn(email) {
  const {r,data,text}=await raw('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});
  assert(r.ok && data?.access_token,`sign-in API failed: ${text}`); return data;
}
async function createCase(token) {
  const case_input={consumer_name:'UI QA Consumer',merchant_name:'UI QA Merchant',product_service:'UI QA Headphones',product_url:'https://example.com/product/uiqa',amount:125.5,currency:'USD',order_id:`UIQA-${RUN}`,purchase_date:'2026-08-20',promised_delivery_date:'2026-08-25',description:'UI browser QA claim. The product did not arrive by the promised date.',requested_resolution:'partial_refund'};
  const {r,data,text}=await raw('/rest/v1/rpc/create_consumer_case',{method:'POST',token,body:{case_input}});
  assert(r.ok,`create case failed: ${text}`); return typeof data==='string'?data:String(data);
}
async function caseAction(token, caseId, action, payload={}) { return fn('case-action',{caseId,action,payload},token); }

async function loginUI(page,email) {
  await page.goto(`${SITE}/#/auth`,{waitUntil:'domcontentloaded'});
  await page.locator("input[type='email']").fill(email);
  await page.locator("input[type='password']").fill(password);
  await page.locator('form.authCard button.primary').click();
  await page.waitForFunction(()=>location.hash.includes('/dashboard'),null,{timeout:15000});
  await page.locator('.appMain').waitFor({state:'visible'});
}
async function noHorizontalOverflow(page,label) {
  const x = await page.evaluate(()=>({viewport:innerWidth,html:document.documentElement.scrollWidth,body:document.body.scrollWidth}));
  assert(x.html <= x.viewport + 2 && x.body <= x.viewport + 2,`${label} horizontal overflow: ${JSON.stringify(x)}`);
  log(`${label}_overflow`,x);
}
async function withinViewport(page, selector, label) {
  const box=await page.locator(selector).boundingBox(); assert(box,`${label} missing`);
  const vp=page.viewportSize(); assert(box.x>=-1 && box.x+box.width<=vp.width+1,`${label} outside horizontal viewport: ${JSON.stringify(box)}`);
}

await mkdir('ui-qa-artifacts',{recursive:true});
let browser;
try {
  await register(consumerEmail,'consumer');
  await register(merchantEmail,'merchant');
  const consumer=await signIn(consumerEmail); const merchant=await signIn(merchantEmail);
  const caseId=await createCase(consumer.access_token);
  const invite=await fn('merchant-invite',{caseId},consumer.access_token);
  await caseAction(consumer.access_token,caseId,'submit',{label:'UI QA submitted'});
  await fn('redeem-invite',{token:invite.path.split('/').pop()},merchant.access_token);
  await caseAction(merchant.access_token,caseId,'view',{label:'UI QA merchant viewed'});
  log('fixture',{consumerEmail,merchantEmail,caseId});

  browser=await chromium.launch({headless:true});

  const desktop=await browser.newContext({viewport:{width:1440,height:900}});
  const page=await desktop.newPage();
  await loginUI(page,consumerEmail);
  assert(await page.locator('.sidebar').isVisible(),'desktop sidebar not visible');
  assert(await page.locator('.sidebar nav button.active').count()===1,'desktop active navigation missing');
  await noHorizontalOverflow(page,'desktop_dashboard');

  await page.goto(`${SITE}/#/claim/${caseId}`,{waitUntil:'domcontentloaded'});
  await page.locator('.caseLayout').waitFor({state:'visible'});
  const passportRows=await page.locator('.passportGrid .row').count();
  assert(passportRows>=9,`transaction passport incomplete: ${passportRows} rows`);
  const passportText=await page.locator('.passportGrid').innerText();
  for(const expected of ['UI QA Consumer','UI QA Merchant',`UIQA-${RUN}`,'UI QA Headphones','125.5','USD']) assert(passportText.includes(expected),`passport missing ${expected}`);
  assert(await page.locator('.evidencePanel').isVisible(),'evidence panel missing');
  assert(await page.locator('.caseBackBtn').isVisible(),'dashboard return button missing');
  await noHorizontalOverflow(page,'desktop_claim');

  await page.locator('.aiOpenBtn').click();
  await page.locator('.aiDrawer').waitFor({state:'visible'});
  await withinViewport(page,'.aiDrawer','desktop AI drawer');
  await withinViewport(page,'.chatComposer textarea','desktop AI textarea');
  await withinViewport(page,'.chatComposer .primary','desktop AI send');
  await page.locator('.chatComposer textarea').fill('Give me the next practical step for this claim.');
  await page.locator('.chatComposer .primary').click();
  await page.locator('.chatMsg.assistant').last().waitFor({state:'visible',timeout:30000});
  const reply=(await page.locator('.chatMsg.assistant').last().innerText()).trim();
  assert(reply.length>20,'AI chat reply too short or missing');
  log('desktop_ai_reply_chars',reply.length);
  await page.screenshot({path:'ui-qa-artifacts/consumer-desktop.png',fullPage:true});
  await desktop.close();

  const mobile=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const m=await mobile.newPage();
  await loginUI(m,consumerEmail);
  assert(await m.locator('.mobileMenu').isVisible(),'mobile menu button missing');
  await noHorizontalOverflow(m,'mobile_dashboard');
  await m.locator('.mobileMenu').click();
  await m.locator('.sidebar.open').waitFor({state:'visible'});
  assert(await m.locator('.menuBackdrop').isVisible(),'mobile menu backdrop missing');
  await m.locator('.menuBackdrop').click({position:{x:300,y:400}});
  await m.goto(`${SITE}/#/claim/${caseId}`,{waitUntil:'domcontentloaded'});
  await m.locator('.caseLayout').waitFor({state:'visible'});
  await noHorizontalOverflow(m,'mobile_claim');
  await m.locator('.aiOpenBtn').click();
  await m.locator('.aiDrawer').waitFor({state:'visible'});
  await withinViewport(m,'.aiDrawer','mobile AI drawer');
  await withinViewport(m,'.chatComposer textarea','mobile AI textarea');
  await withinViewport(m,'.chatComposer .primary','mobile AI send');
  const drawerBox=await m.locator('.aiDrawer').boundingBox();
  assert(drawerBox.width<=391,`mobile drawer too wide: ${drawerBox.width}`);
  await m.screenshot({path:'ui-qa-artifacts/consumer-mobile.png',fullPage:false});
  await mobile.close();

  const merch=await browser.newContext({viewport:{width:1280,height:900}});
  const mp=await merch.newPage();
  await loginUI(mp,merchantEmail);
  await mp.goto(`${SITE}/#/claim/${caseId}`,{waitUntil:'domcontentloaded'});
  await mp.locator('.merchantBox').waitFor({state:'visible'});
  const select=mp.locator('.merchantBox select');
  await select.selectOption('partial_refund');
  assert(await mp.locator('.amountWithCurrency input').isVisible(),'partial refund amount input missing');
  const offer=mp.locator('.merchantBox button.primary');
  assert(await offer.isDisabled(),'partial refund offer should be disabled without amount');
  await mp.locator('.amountWithCurrency input').fill('25');
  assert(!(await offer.isDisabled()),'partial refund offer stayed disabled after valid amount');
  assert(await mp.locator('.merchantBox button.danger').isDisabled(),'reject should require a written reason');
  await mp.locator('.merchantBox textarea').fill('UI QA written merchant note');
  assert(!(await mp.locator('.merchantBox button.danger').isDisabled()),'reject did not enable after written reason');
  await noHorizontalOverflow(mp,'merchant_claim');
  await mp.screenshot({path:'ui-qa-artifacts/merchant-desktop.png',fullPage:true});
  await merch.close();

  console.log('UIQA_RESULT='+JSON.stringify({ok:true,run:RUN,consumerEmail,merchantEmail,caseId}));
} catch (e) {
  console.error('UIQA_RESULT='+JSON.stringify({ok:false,run:RUN,consumerEmail,merchantEmail,error:e?.message||String(e)}));
  process.exitCode=1;
} finally {
  if(browser) await browser.close();
}
