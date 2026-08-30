import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const UPSTREAM = "https://resolverelai.netlify.app";
const ROUTES: Record<string, string> = {
  "claim-assist": "/api/claim-assist",
  "merchant-support": "/api/merchant-support",
  "claim-package": "/api/claim-package",
  "claim-chat": "/api/claim-chat",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });

  try {
    const length = Number(req.headers.get("content-length") || 0);
    if (length > 512 * 1024) return Response.json({ error: "Payload too large" }, { status: 413, headers: corsHeaders });

    const body = await req.json();
    const route = String(body?.route || "");
    const target = ROUTES[route];
    if (!target) return Response.json({ error: "Unsupported AI route" }, { status: 404, headers: corsHeaders });

    const upstream = await fetch(`${UPSTREAM}${target}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.get("authorization") || "",
        "X-ResolveRelay-Relay": "supabase-edge",
      },
      body: JSON.stringify(body?.payload ?? {}),
      signal: AbortSignal.timeout(25000),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstream.headers.get("content-type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("ai-relay failed", error instanceof Error ? error.name : "Error");
    return Response.json({ error: "AI service is temporarily unavailable." }, { status: 502, headers: corsHeaders });
  }
});
