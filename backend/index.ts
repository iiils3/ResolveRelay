import { router, json, error, ai } from '@appdeploy/sdk';
import { realtimeSubscriptionRoutes } from './realtime-subscribers';

const allowedTasks = new Set(['neutral_summary','missing_evidence','next_step']);

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],
  'POST /api/claim-assist': [async ({ body }) => {
    const input = (body || {}) as { task?: string; lang?: string; claim?: unknown };
    if (!input.task || !allowedTasks.has(input.task)) return error('Unsupported assistant task', 400);
    const serialized = JSON.stringify(input.claim ?? {});
    if (serialized.length > 12000) return error('Claim context is too large', 400);
    const arabic = input.lang === 'ar';
    const taskInstruction = input.task === 'neutral_summary'
      ? 'Give a concise neutral summary of the purchase problem, facts, requested outcome, and current status.'
      : input.task === 'missing_evidence'
        ? 'List only practical evidence that appears missing from the supplied claim facts. Do not invent evidence.'
        : 'Give the single best practical next step based only on the current claim status and supplied facts.';
    try {
      const result = await ai.generate({
        system: `You are ResolveRelay Claim Assistant. You are not a lawyer, judge, mediator, or decision-maker. Never provide legal advice, legal conclusions, guarantees, accusations, laws, deadlines, or invented merchant policies. Use only the supplied claim facts. Keep a neutral tone. Never change claim state or tell the user an action was executed. ${arabic ? 'Respond in clear Modern Standard Arabic.' : 'Respond in clear English.'}`,
        prompt: `${taskInstruction}\n\nClaim facts:\n${serialized}`,
        thinkingMode: 'FAST',
        temperature: 0.2,
        maxTokens: 550
      });
      return json({ text: result.text, requiresHumanReview: true });
    } catch (e) {
      console.error('claim-assist failed', e);
      return error(arabic ? 'خدمة الذكاء الاصطناعي غير متاحة مؤقتًا.' : 'AI service is temporarily unavailable.', 503);
    }
  }],
  ...realtimeSubscriptionRoutes,
});
