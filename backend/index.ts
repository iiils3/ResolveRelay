import { router, json, error, ai } from '@appdeploy/sdk';
import { realtimeSubscriptionRoutes } from './realtime-subscribers';

const allowedTasks = new Set(['neutral_summary','missing_evidence','next_step']);
const systemBase = `You are ResolveRelay Claim Assistant. Stay strictly within post-purchase claims and merchant communication. Be neutral, factual, calm, and concise. Do not show sympathy, hostility, blame, or accusations toward either party. Never invent facts, merchant policies, laws, deadlines, emails, or contact details. You may provide general legal-information style guidance and help draft a firm professional claim message, but clearly avoid pretending to be a lawyer or giving jurisdiction-specific legal conclusions unless the applicable jurisdiction and verified source are supplied. Never claim an action was executed. Never discuss unrelated topics. If the user asks something outside ResolveRelay's scope, briefly say it is outside your role and redirect to the claim. Always finish complete sentences and never end an answer mid-sentence.`;

async function generateStable(options:{system:string;prompt:string;maxTokens:number}){
  try{return await ai.generate({system:options.system,prompt:options.prompt,thinkingMode:'FAST',temperature:0.2,maxTokens:options.maxTokens});}
  catch(first){console.warn('AI first attempt failed',first);return ai.generate({system:options.system,prompt:options.prompt,thinkingMode:'NONE',temperature:0.1,maxTokens:options.maxTokens});}
}

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'POST /api/claim-assist': [async ({ body }) => {
    const input = (body || {}) as { task?: string; lang?: string; claim?: unknown };
    if (!input.task || !allowedTasks.has(input.task)) return error('Unsupported assistant task', 400);
    const serialized = JSON.stringify(input.claim ?? {});
    if (serialized.length > 12000) return error('Claim context is too large', 400);
    const arabic = input.lang === 'ar';
    const taskInstruction = input.task === 'neutral_summary' ? 'Give a concise neutral summary of the purchase problem, facts, requested outcome, and current status. Finish the answer completely.' : input.task === 'missing_evidence' ? 'List only practical evidence that appears missing from the supplied claim facts. Do not invent evidence. Finish the list completely.' : 'Give the best practical next step based only on the current claim status and supplied facts. Use two or three complete sentences and do not end mid-sentence.';
    try {
      const result = await generateStable({system:`${systemBase} ${arabic ? 'Respond in clear Arabic.' : 'Respond in clear English.'}`,prompt:`${taskInstruction}\n\nClaim facts:\n${serialized}`,maxTokens:900});
      return json({ text: result.text, requiresHumanReview: true });
    } catch (e) { console.error('claim-assist failed', e); return error(arabic ? 'خدمة الذكاء الاصطناعي غير متاحة مؤقتًا.' : 'AI service is temporarily unavailable.', 503); }
  }],
  'POST /api/merchant-support': [async ({ body }) => {
    const input=(body||{}) as {productUrl?:string;lang?:string};
    const arabic=input.lang==='ar';
    if(!input.productUrl)return error(arabic?'رابط المنتج مطلوب.':'Product URL is required.',400);
    let u:URL;
    try{u=new URL(input.productUrl)}catch{return error(arabic?'رابط المنتج غير صالح.':'Invalid product URL.',400)}
    if(!['http:','https:'].includes(u.protocol))return error('Invalid product URL',400);
    const h=u.hostname.toLowerCase();
    if(h==='localhost'||h==='127.0.0.1'||h.startsWith('10.')||h.startsWith('192.168.')||/^172\.(1[6-9]|2\d|3[01])\./.test(h))return error('Private network URLs are not allowed',400);
    const root=u.origin;
    const candidates=Array.from(new Set([root+'/',root+'/support',root+'/help',root+'/contact',root+'/contact-us',root+'/customer-service',root+'/faq',root+'/returns',root+'/refunds']));
    const supportSignal=/support|help|contact|customer\s*service|returns?|refunds?|warranty|complaint|خدمة\s*العملاء|دعم|تواصل|اتصل|استرجاع|استرداد/i;
    const checked=await Promise.allSettled(candidates.map(async url=>{const scraped=await ai.scrape({url});if(scraped.status>=400||!scraped.text)return null;const signal=(scraped.title||'')+' '+scraped.text.slice(0,5000);if(!supportSignal.test(signal)&&new URL(url).pathname!=='/')return null;const found=Array.from(new Set((scraped.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)||[]).map(x=>x.toLowerCase())));return {page:{url,title:scraped.title||''},emails:found}}));
    const pages:Array<{url:string;title:string}>=[];const emailSources=new Map<string,string>();for(const item of checked){if(item.status!=='fulfilled'||!item.value)continue;pages.push(item.value.page);for(const email of item.value.emails)if(!emailSources.has(email))emailSources.set(email,item.value.page.url)}
    return json({origin:root,pages:pages.slice(0,7),emails:Array.from(emailSources.entries()).slice(0,10).map(([email,source])=>({email,source}))});
  }],
  'POST /api/claim-package': [async ({ body }) => {const input=(body||{}) as {lang?:string;claim?:unknown;merchantInvite?:string};const arabic=input.lang==='ar';const serialized=JSON.stringify(input.claim??{});if(serialized.length>12000)return error('Claim context is too large',400);try{const result=await generateStable({system:`${systemBase} ${arabic?'Write in clear professional Arabic.':'Write in clear professional English.'} Draft a merchant-facing claim message only from supplied facts. Do not invent laws, deadlines, policies, contact details, threats, or accusations. Use a subject line, a short factual body, the requested outcome, and a polite request for written response. If a merchant invitation URL is supplied, include it once near the end.`,prompt:`Claim facts:\n${serialized}\n\nMerchant invitation URL:\n${input.merchantInvite||'Not supplied'}\n\nPrepare a complete message ready for human review and sending.`,maxTokens:1200});return json({text:result.text,requiresHumanReview:true})}catch(e){console.error('claim-package failed',e);return error(arabic?'تعذر تجهيز رسالة المطالبة مؤقتًا.':'Could not prepare the claim message right now.',503)} }],
  'POST /api/claim-chat': [async ({ body }) => {
    const input = (body || {}) as { lang?: string; claim?: unknown; messages?: Array<{role:'user'|'assistant';content:string}>; merchantWebsite?: string };
    const arabic = input.lang === 'ar';
    const claim = JSON.stringify(input.claim ?? {});
    if (claim.length > 12000) return error('Claim context is too large', 400);
    const history = Array.isArray(input.messages) ? input.messages.slice(-12).filter(m=>m && (m.role==='user'||m.role==='assistant') && typeof m.content==='string' && m.content.length<=3000) : [];
    if (!history.length) return error('Message is required', 400);
    let websiteContext = '';
    const latest=history[history.length-1]?.content?.toLowerCase()||'';
    const needsContact=/email|e-mail|contact|support|بريد|ايميل|إيميل|تواصل|دعم/.test(latest);
    if (input.merchantWebsite && needsContact) {
      try {
        const u = new URL(input.merchantWebsite);
        if (!['http:','https:'].includes(u.protocol)) return error('Invalid merchant website',400);
        const scraped = await ai.scrape({url:u.toString()});
        if (scraped.status < 400) websiteContext = `\n\nVerified merchant website content supplied by ResolveRelay scraper from ${u.origin}:\n${scraped.text.slice(0,9000)}`;
      } catch { return error(arabic ? 'تعذر التحقق من موقع التاجر.' : 'Could not verify the merchant website.', 400); }
    }
    const transcript = history.map(m=>`${m.role==='user'?'USER':'ASSISTANT'}: ${m.content}`).join('\n\n');
    try {
      const result = await generateStable({system:`${systemBase} ${arabic ? 'Respond in clear Arabic.' : 'Respond in clear English.'} If official website content is supplied, identify an email address ONLY if it appears verbatim in that scraped official-site content. If no email is present, say you could not verify one; never guess. When asked, draft a professional claim email based only on the claim facts, with a subject line and concise factual body.`,prompt:`Claim facts:\n${claim}${websiteContext}\n\nConversation so far:\n${transcript}\n\nAnswer the user's latest message. Preserve context from earlier turns. Give a complete response and never cut off mid-sentence.`,maxTokens:1400});
      return json({text:result.text,requiresHumanReview:true,websiteChecked:Boolean(input.merchantWebsite&&needsContact)});
    } catch (e) { console.error('claim-chat failed', e); return error(arabic ? 'تعذر تشغيل مساعد المطالبة مؤقتًا.' : 'Claim assistant is temporarily unavailable.',503); }
  }],
  ...realtimeSubscriptionRoutes,
});
