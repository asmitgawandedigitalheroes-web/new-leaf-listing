import { serve } from "http/server.ts";
import { createClient } from "supabase";
import { SmtpClient } from "smtp";

/**
 * send-email Edge Function
 * 
 * Sends an email via SMTP using credentials provided in environment variables.
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

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("[send-email] Missing Authorization header");
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    console.log(`[send-email] Received token (start): ${token.substring(0, 10)}...`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("[send-email] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing from environment");
      throw new Error("Server configuration error");
    }

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError) {
      console.error(`[send-email] Auth error: ${authError.message}`);
      throw new Error(`Unauthorized: ${authError.message}`);
    }
    if (!user) {
      console.error("[send-email] No user found for token");
      throw new Error("Unauthorized: No user found");
    }

    // 2. Parse request body
    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      throw new Error("Missing required fields: to, subject, html");
    }

    // 3. Get SMTP credentials
    const host = Deno.env.get("SMTP_HOST");
    const port = parseInt(Deno.env.get("SMTP_PORT") ?? "587");
    const username = Deno.env.get("SMTP_USER");
    const password = Deno.env.get("SMTP_PASS");
    const from = Deno.env.get("SMTP_FROM") ?? "no-reply@nlvlistings.com";

    if (!host || !username || !password) {
      throw new Error("SMTP credentials not configured in Edge Function environment");
    }

    // 4. Send email
    const client = new SmtpClient();
    await client.connectTLS({
      hostname: host,
      port: port,
      username: username,
      password: password,
    });

    await client.send({
      from: from,
      to: to,
      subject: subject,
      content: html,
      html: html,
    });

    await client.close();

    console.log(`[send-email] Successfully sent email to ${to}`);

    return new Response(JSON.stringify({ sent: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const error = err as Error;
    console.error(`[send-email] Error: ${error.message}`);
    return new Response(JSON.stringify({ sent: false, error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
