import { serve } from "http/server.ts";
import { SmtpClient } from "smtp";

/**
 * send-email Edge Function
 *
 * Sends an email via SMTP using credentials provided in environment variables.
 * JWT verification is disabled (verify_jwt = false) — Supabase handles auth at
 * the gateway level via the project's anon/service key.
 */

const url = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("ADMIN_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Standard CORS headers for development flexibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!url || !serviceKey) {
      console.error("[send-email] Configuration is missing from environment");
      throw new Error("Server configuration error: Missing ADMIN_SERVICE_ROLE_KEY");
    }

    // 1. Parse request body
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
