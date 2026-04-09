import { serve } from "http/server.ts";
import { createClient } from "supabase";

// Standard CORS headers for Supabase Edge Functions
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  console.log(`[admin-create-user] Function started: ${req.method}`);
  
  // Log all request headers for debugging
  console.log("[admin-create-user] Headers received:");
  for (const [key, value] of req.headers.entries()) {
    console.log(`  - ${key}: ${key.toLowerCase() === 'authorization' ? value.substring(0, 15) + '...' : value}`);
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { 
      headers: { 
        ...corsHeaders,
        "Access-Control-Allow-Headers": "Authorization, authorization, x-client-info, apikey, content-type" 
      } 
    });
  }

  try {
    // Log environment variable keys for diagnostic purposes
    console.log("[admin-create-user] Available environment keys:", Object.keys(Deno.env.toObject()));

    // Use a custom secret name to bypass SUPABASE_ prefix restrictions in CLI
    const serviceKey = Deno.env.get("ADMIN_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const url = Deno.env.get("SUPABASE_URL");

    // Verify presence of required environment variables
    if (!serviceKey || !url) {
      console.error("[admin-create-user] CRITICAL: Environment variables missing.");
      return new Response(JSON.stringify({ 
        error: "Server configuration missing: Please run 'npx supabase secrets set ADMIN_SERVICE_ROLE_KEY=YOUR_SERVICE_KEY' to proceed." 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Create service-role client (bypasses RLS) for admin user creation
    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse body first — we read caller_token from body to avoid gateway JWT issues
    const body = await req.json();
    const { email, full_name, role, phone, territory_id, plan, caller_token } = body;

    // Fallback: also accept Authorization header
    const authHeader = req.headers.get("authorization");
    const token = caller_token || (authHeader ? authHeader.replace(/^Bearer /i, "") : null);

    if (!token) {
      console.error("[admin-create-user] No caller token provided.");
      return new Response(JSON.stringify({ error: "Missing authorization token" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Verify the caller is an admin by checking their JWT
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error("[admin-create-user] Auth verification failed:", authError?.message || 'No user found');
      return new Response(JSON.stringify({ 
        error: `Invalid or expired session: ${authError?.message || 'Unauthorized'}` 
      }), {
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

    // Validate required fields
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

    // Derive the app origin from the request so redirectTo works in all environments
    const origin = req.headers.get("origin") || req.headers.get("referer")?.split("/").slice(0, 3).join("/") || url;

    // Create the auth user using invitation API (this sends the email automatically).
    // redirectTo lands the user on our custom password-set page (not Supabase's default).
    // ?type=invite   → ResetPasswordPage shows "Create your password" copy
    // ?source=admin  → After password set, redirect to /pricing so user can subscribe
    const { data: newUser, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: { full_name, role },
        redirectTo: `${origin}/reset-password?type=invite&source=admin`,
      }
    );

    if (inviteError) {
      console.error("[admin-create-user] Auth invite error:", inviteError.message);
      return new Response(JSON.stringify({ error: inviteError.message }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Profile starts as "pending" — the user must complete payment (14-day trial)
    // before their account is activated. The stripe-webhook flips status → "active"
    // and stamps verified_at once checkout.session.completed fires.
    const now = new Date().toISOString();

    // Insert profile row — use only columns that exist in the profiles table schema
    const profileInsert: Record<string, unknown> = {
      id: newUser.user.id,
      email,
      full_name,
      role,
      status: "pending",        // Activated by Stripe webhook after subscription start
      phone: phone ?? null,
      // verified_at intentionally omitted — set by webhook after first subscription
    };

    if (territory_id) {
      profileInsert.territory_id = territory_id;
    }

    const { error: profileInsertError } = await supabaseAdmin
      .from("profiles")
      .insert(profileInsert);

    if (profileInsertError) {
      // Rollback: delete the invited auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      console.error("[admin-create-user] Profile insert error:", profileInsertError.message);
      return new Response(JSON.stringify({ error: `Profile creation failed: ${profileInsertError.message}` }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Write audit log
    await supabaseAdmin.from("audit_logs").insert({
      user_id: caller.id,
      action: "admin.create_user",
      entity_type: "profile",
      entity_id: newUser.user.id,
      metadata: { email, role, full_name, status: "pending", requires_subscription: true, territory_id: territory_id ?? null },
      timestamp: now,
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
