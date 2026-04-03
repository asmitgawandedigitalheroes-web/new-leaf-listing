import { serve } from "http/server.ts";
import { createClient } from "supabase";

// Standard CORS headers for development flexibility
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  console.log(`[AdminDeleteUser] Request started: ${req.method}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    // Accept either ADMIN_SERVICE_ROLE_KEY or the standard SUPABASE_SERVICE_ROLE_KEY
    const serviceKey = Deno.env.get("ADMIN_SERVICE_ROLE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!url || !serviceKey) {
      console.error("[AdminDeleteUser] Missing environment variables");
      throw new Error("Server configuration missing");
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Parse body first to check for caller_token
    const body = await req.json();
    const { userId, caller_token } = body;

    if (!userId) {
      throw new Error("Missing required parameter: userId");
    }

    // Determine the user's token (from header or body)
    const authHeader = req.headers.get("Authorization");
    const token = caller_token || (authHeader ? authHeader.replace(/^Bearer /i, "") : null);

    if (!token) {
      console.error("[AdminDeleteUser] No token provided");
      throw new Error("Unauthorized: Missing token");
    }

    // Verify the caller is an authenticated admin
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !caller) {
      console.error(`[AdminDeleteUser] Auth verification failed: ${authError?.message || 'No user'}`);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401
      });
    }

    // Check caller's role in profiles
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (profileError || callerProfile?.role !== "admin") {
      console.warn(`[AdminDeleteUser] Forbidden attempt by user ${caller.id} with role ${callerProfile?.role}`);
      return new Response(JSON.stringify({ success: false, error: "Forbidden: Admin role required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 403
      });
    }

    // Guard: cannot delete yourself
    if (userId === caller.id) {
      throw new Error("You cannot delete your own account");
    }

    // Guard: cannot delete another admin
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (targetError) {
      console.error(`[AdminDeleteUser] Target profile fetch error: ${targetError.message}`);
    } else if (targetProfile?.role === "admin") {
      throw new Error("Admin accounts cannot be deleted. Suspend the account instead.");
    }

    // Perform deletion from auth.users (cascades to internal profile if FK set up)
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error(`[AdminDeleteUser] Auth delete error: ${deleteError.message}`);
      throw deleteError;
    }

    // Extra safety: explicitly delete profile
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // Audit log entry
    await supabaseAdmin.from("audit_logs").insert({
      user_id: caller.id,
      action: "user.deleted",
      entity_type: "profile",
      entity_id: userId,
      metadata: { deleted_user_id: userId },
      timestamp: new Date().toISOString(),
    });

    console.log(`[AdminDeleteUser] Successfully deleted user ${userId} by admin ${caller.id}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (err) {
    const error = err as Error;
    console.error(`[AdminDeleteUser Error] ${error.message}`);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});

