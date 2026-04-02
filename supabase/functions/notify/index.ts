import { serve } from "http/server.ts";
import { createClient } from "supabase";

/**
 * notify Edge Function
 *
 * Inserts an in-app notification via service_role, bypassing RLS.
 *
 * WHY a dedicated function:
 *   migrations_security_fixes.sql (BUG-037) dropped all authenticated INSERT
 *   policies on the notifications table to prevent inbox flooding and
 *   system-alert impersonation. After that fix, client-side code using a
 *   user JWT can no longer insert notifications — the only safe write path
 *   is service_role (which bypasses RLS entirely).
 *
 * Auth: caller must supply a valid JWT. The notification is always written
 * for the target user_id in the payload, not necessarily the caller — this
 * is intentional (e.g. routing service notifying a realtor on behalf of the
 * system). The JWT requirement ensures at minimum the caller is authenticated.
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

const VALID_TYPES = new Set(["lead", "listing", "payment", "commission", "system"]);

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

    const { user_id, title, message, type, entity_id } = await req.json();

    if (!user_id || !title || !message || !type) {
      throw new Error("Missing required fields: user_id, title, message, type");
    }

    if (!VALID_TYPES.has(type)) {
      throw new Error(`Invalid notification type: ${type}. Must be one of: ${[...VALID_TYPES].join(", ")}`);
    }

    const { error: insertError } = await supabaseAdmin.from("notifications").insert({
      user_id,
      title,
      message,
      type,
      entity_id: entity_id ?? null,
      read:      false,
      created_at: new Date().toISOString(),
    });

    if (insertError) throw insertError;

    return new Response(JSON.stringify({ notified: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const error = err as Error;
    console.error(`[notify] ${error.message}`);
    return new Response(JSON.stringify({ notified: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
