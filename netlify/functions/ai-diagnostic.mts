import type { Config } from '@netlify/functions';

export default async () => {
  const apiKey = Netlify.env.get('OPENAI_API_KEY');
  const model = Netlify.env.get('OPENAI_MODEL') || 'gpt-5.6-luna';

  if (!apiKey) {
    return Response.json({ ok: false, stage: 'environment', code: 'OPENAI_API_KEY_MISSING', model }, { status: 503 });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        input: 'Reply with OK only.',
        max_output_tokens: 8,
      }),
    });

    const data: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      return Response.json({
        ok: false,
        stage: 'openai',
        providerStatus: response.status,
        providerCode: data?.error?.code || null,
        providerType: data?.error?.type || null,
        model,
      }, { status: 200 });
    }

    return Response.json({ ok: true, stage: 'openai', providerStatus: response.status, model });
  } catch {
    return Response.json({ ok: false, stage: 'network', code: 'OPENAI_REQUEST_FAILED', model }, { status: 200 });
  }
};

export const config: Config = {
  path: '/internal/ai-diagnostic',
};
