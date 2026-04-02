import { serve } from "http/server.ts";
import { createClient } from "supabase";

/**
 * crm-retry Edge Function
 *
 * Receives a failed CRM sync item from crm.service.ts and inserts it into
 * crm_sync_queue using the service_role key, which bypasses RLS.
 *
 * WHY a dedicated function:
 *   The migrations_architecture_fixes.sql migration dropped the
 *   crm_sync_queue INSERT policy for authenticated users because any
 *   authenticated user could otherwise enqueue outbound HTTP calls to
 *   arbitrary CRM webhook URLs (DoS / data-exfil vector). Service_role
 *   bypasses RLS, so no explicit policy is needed here.
 *
 * Auth: caller must be authenticated (JWT verified). The payload fields
 * themselves are validated before insert to prevent injection.
 */

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ?? "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : "";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
}

const VALID_PROVIDERS = new Set(["ghl", "salespro", "leap"]);
const VALID_STATUSES  = new Set(["pending", "failed"]);

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !caller) throw new Error("Unauthorized");

    const body = await req.json();
    const { provider, lead_id, payload, attempts, last_error, status, next_retry_at } = body;

    // Validate inputs before writing to prevent injection or constraint violations.
    if (!VALID_PROVIDERS.has(provider)) throw new Error(`Invalid provider: ${provider}`);
    if (!VALID_STATUSES.has(status))   throw new Error(`Invalid status: ${status}`);
    if (typeof attempts !== "number" || attempts < 1) throw new Error("Invalid attempts value");

    const { error: insertError } = await supabaseAdmin.from("crm_sync_queue").insert({
      provider,
      lead_id:      lead_id ?? null,
      payload:      payload ?? {},
      attempts,
      last_error:   last_error ?? null,
      status,
      next_retry_at,
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ queued: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const error = err as Error;
    console.error(`[crm-retry] ${error.message}`);
    return new Response(JSON.stringify({ queued: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
