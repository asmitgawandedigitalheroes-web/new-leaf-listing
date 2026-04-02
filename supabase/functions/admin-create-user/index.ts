import { serve } from "http/server.ts";
import { createClient } from "supabase";

// BUG-034: Replace wildcard CORS with an explicit allowlist.
// Set ALLOWED_ORIGINS env var to a comma-separated list of permitted origins
// (e.g. "https://app.nlvlistings.com,https://admin.nlvlistings.com").
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
  console.log(`[admin-create-user] Function started: ${req.method}`);
  
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify caller is authenticated admin via service role
    const authHeader = req.headers.get("authorization");
    console.log(`[admin-create-user] Auth Header: ${authHeader ? 'Present (' + authHeader.substring(0, 15) + '...)' : 'MISSING'}`);

    if (!authHeader) {
      console.error("[admin-create-user] Missing authorization header");
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Use service-role client (bypasses RLS) for admin user creation
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller is an admin by checking their JWT
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError || !caller) {
      console.error("[admin-create-user] Auth verification failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Check caller's role in profiles
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profileError || callerProfile?.role !== "admin") {
      console.warn("[admin-create-user] Unauthorized role access attempt:", callerProfile?.role);
      return new Response(JSON.stringify({ error: "Forbidden: admin role required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403,
      });
    }

    const { email, password: providedPassword, full_name, role, phone, territory_id } = await req.json();

    // Validate required fields (password optional — we'll auto-generate + send reset email)
    if (!email || !full_name || !role) {
      return new Response(JSON.stringify({ error: "Missing required fields: email, full_name, role" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const validRoles = ["admin", "director", "realtor"];
    if (!validRoles.includes(role)) {
      return new Response(JSON.stringify({ error: `Invalid role. Must be one of: ${validRoles.join(", ")}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Generate a secure temporary password if none was provided
    const tempPassword = providedPassword ||
      Array.from(crypto.getRandomValues(new Uint8Array(18)))
        .map(b => b.toString(36))
        .join('')
        .slice(0, 18) + 'A1!';

    // Create the auth user using service role (skips email confirmation)
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true, // auto-confirm so they can log in immediately
      // BUG-009 fix: role must NOT be stored in user_metadata.
      // Role is authoritative only in the profiles table (written below).
      // Storing it in metadata created an escalation vector where the metadata
      // value could be read by client code and treated as the user's real role.
      user_metadata: { full_name },
    });

    if (createError) {
      console.error("[admin-create-user] Auth create error:", createError.message);
      return new Response(JSON.stringify({ error: createError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Insert profile row
    const profileInsert: Record<string, unknown> = {
      id: newUser.user.id,
      email,
      full_name,
      role,
      status: "active",
      phone: phone ?? null,
    };

    if (territory_id) {
      profileInsert.territory_id = territory_id;
    }

    const { error: profileInsertError } = await supabaseAdmin
      .from("profiles")
      .insert(profileInsert);

    if (profileInsertError) {
      // Rollback: delete the auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      console.error("[admin-create-user] Profile insert error:", profileInsertError.message);
      return new Response(JSON.stringify({ error: `Profile creation failed: ${profileInsertError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Send password reset so the new user can set their own password on first login
    // (only when we auto-generated the password — if admin supplied one, skip)
    if (!providedPassword) {
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
      }).catch((err: Error) => {
        // Non-fatal — user can still log in, just won't get the welcome email
        console.warn("[admin-create-user] Failed to send password reset email:", err.message);
      });
    }

    // Write audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: caller.id,
      action: "admin.create_user",
      entity_type: "profile", // Use profile as entity_type
      entity_id: newUser.user.id,
      metadata: { email, role, full_name },
      timestamp: new Date().toISOString(),
    });

    return new Response(
      JSON.stringify({
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          full_name,
          role,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const err = error as Error;
    console.error(`[admin-create-user] Unexpected error: ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
