import type { Config } from '@netlify/functions';

export default async () => {
  const apiKey = Netlify.env.get('OPENAI_API_KEY');
  const model = Netlify.env.get('OPENAI_MODEL') || 'gpt-5.6-luna';
  if (!apiKey) return Response.json({ ok: false, stage: 'environment', code: 'OPENAI_API_KEY_MISSING', model }, { status: 503 });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        instructions: 'You are a concise post-purchase claim assistant. Reply in one complete sentence.',
        input: 'Give one practical next step when an item was not delivered and the customer wants a full refund.',
        max_output_tokens: 900,
      }),
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json({ ok: false, stage: 'openai', providerStatus: response.status, providerCode: data?.error?.code || null, providerType: data?.error?.type || null, model }, { status: 200 });
    }
    const output = Array.isArray(data?.output) ? data.output : [];
    return Response.json({
      ok: true,
      stage: 'openai',
      providerStatus: response.status,
      model,
      hasOutputTextField: typeof data?.output_text === 'string',
      outputLength: output.length,
      outputTypes: output.map((x: any) => x?.type || null),
      contentTypes: output.flatMap((x: any) => Array.isArray(x?.content) ? x.content.map((c: any) => c?.type || null) : []),
    });
  } catch {
    return Response.json({ ok: false, stage: 'network', code: 'OPENAI_REQUEST_FAILED', model }, { status: 200 });
  }
};

export const config: Config = { path: '/internal/ai-diagnostic' };
