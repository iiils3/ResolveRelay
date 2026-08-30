import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

type DemoRole = "consumer" | "merchant";

function demoIdentity(role: DemoRole) {
  const prefix = role === "consumer" ? "DEMO_CONSUMER" : "DEMO_MERCHANT";
  const id = Deno.env.get(`${prefix}_USER_ID`);
  const email = Deno.env.get(`${prefix}_EMAIL`);
  const password = Deno.env.get(`${prefix}_PASSWORD`);
  if (!id || !email || !password) throw new Error(`Missing ${prefix} demo configuration`);
  return { id, email, password };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  const role: DemoRole | null =
    body.role === "consumer" ? "consumer" : body.role === "merchant" ? "merchant" : null;
  if (!role) return json({ error: "Choose consumer or merchant" }, 400);

  // These values only provide a frictionless evaluation form. They are never
  // used as credentials for the underlying Supabase identity.
  const enteredEmail = String(body.email ?? "").trim();
  const enteredPassword = String(body.password ?? "");
  if (!enteredEmail || !enteredPassword) return json({ error: "Enter any email and password" }, 400);
  if (enteredEmail.length > 254 || enteredPassword.length > 256) return json({ error: "Input is too long" }, 400);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceRoleKey || !anonKey) throw new Error("Supabase runtime configuration unavailable");

    const target = demoIdentity(role);
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Refresh the pre-provisioned demo identity to a known server-only secret.
    // The secret itself is configured in Supabase and is never shipped to the browser.
    const updated = await admin.auth.admin.updateUserById(target.id, {
      password: target.password,
      email_confirm: true,
      user_metadata: {
        account_role: role,
        name: role === "merchant" ? "Demo Merchant" : "Demo Consumer",
      },
    });
    if (updated.error) throw updated.error;

    const client = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signed = await client.auth.signInWithPassword({
      email: target.email,
      password: target.password,
    });
    if (signed.error || !signed.data.session) throw signed.error ?? new Error("No demo session returned");

    const { access_token, refresh_token, expires_in, expires_at, token_type } = signed.data.session;
    return json({
      role,
      session: { access_token, refresh_token, expires_in, expires_at, token_type },
    });
  } catch (error) {
    console.error("demo-login failed", error instanceof Error ? error.message : "Error");
    return json({ error: "Demo access is temporarily unavailable" }, 503);
  }
});
