import { serve } from "http/server.ts";
import { createClient } from "supabase";

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
    const serviceKey =
      Deno.env.get("ADMIN_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      "";

    if (!url || !serviceKey) {
      console.error("[AdminDeleteUser] Missing env vars");
      return new Response(
        JSON.stringify({ success: false, error: "Server misconfigured: missing service role key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Parse request ──────────────────────────────────────────────────────────
    const body = await req.json();
    const { userId, caller_token } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameter: userId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const authHeader = req.headers.get("Authorization");
    const token =
      caller_token ||
      (authHeader ? authHeader.replace(/^Bearer /i, "") : null);

    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: no token provided" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // ── Identify caller from JWT sub claim ────────────────────────────────────
    let callerId: string;
    try {
      const payloadB64 = token.split(".")[1];
      const payload = JSON.parse(atob(payloadB64));
      callerId = payload.sub;
      if (!callerId) throw new Error("no sub");
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized: invalid token" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }
    const caller = { id: callerId };

    // ── Verify caller is admin ─────────────────────────────────────────────────
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfileError || callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden: admin role required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    // ── Guards ─────────────────────────────────────────────────────────────────
    if (userId === caller.id) {
      return new Response(
        JSON.stringify({ success: false, error: "You cannot delete your own account" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, email")
      .eq("id", userId)
      .single();

    if (targetProfile?.role === "admin") {
      return new Response(
        JSON.stringify({ success: false, error: "Admin accounts cannot be deleted. Suspend instead." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // ── Atomic cleanup via SQL RPC ─────────────────────────────────────────────
    console.log(`[AdminDeleteUser] Running atomic cleanup RPC for user ${userId}`);

    const { data: rpcResult, error: rpcError } = await supabaseAdmin
      .rpc("admin_pre_delete_cleanup", { p_user_id: userId });

    if (rpcError) {
      console.error(`[AdminDeleteUser] RPC call error: ${rpcError.message}`);
    } else {
      console.log(`[AdminDeleteUser] RPC result: ${JSON.stringify(rpcResult)}`);
    }

    // rpcResult is JSONB: { success, auth_deleted, step?, failed_step?, error?, sqlstate? }
    const rpcOk = !rpcError && rpcResult?.success === true;
    const authDeletedBySql = rpcOk && rpcResult?.auth_deleted === true;

    if (!rpcOk) {
      // RPC itself failed — log the step and fall through to manual delete
      console.error(`[AdminDeleteUser] RPC cleanup failed at step: ${rpcResult?.failed_step ?? "unknown"}, error: ${rpcResult?.error ?? rpcError?.message}`);
    }

    // ── Delete from auth.users (skip if SQL function already did it) ──────────
    if (!authDeletedBySql) {
      console.log(`[AdminDeleteUser] Calling auth.admin.deleteUser for ${userId}`);
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error(`[AdminDeleteUser] auth.admin.deleteUser failed: ${deleteError.message}`);

        // Return detailed diagnostic info to help identify the remaining FK
        const diagDetail = rpcResult
          ? `RPC step reached: ${rpcResult.step ?? rpcResult.failed_step ?? "unknown"}, RPC error: ${rpcResult.error ?? "none"}`
          : `RPC call error: ${rpcError?.message ?? "unknown"}`;

        return new Response(
          JSON.stringify({
            success: false,
            error: `Delete failed: ${deleteError.message}`,
            diagnostic: diagDetail,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      // Belt-and-suspenders: remove orphaned profile if cascade didn't fire.
      await supabaseAdmin.from("profiles").delete().eq("id", userId);
    }

    console.log(`[AdminDeleteUser] User ${userId} (${targetProfile?.email ?? "?"}) deleted by admin ${caller.id}`);

    // ── Audit log ─────────────────────────────────────────────────────────────
    try {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: caller.id,
        action: "user.deleted",
        entity_type: "profile",
        entity_id: userId,
        metadata: {
          deleted_user_id: userId,
          deleted_user_email: targetProfile?.email ?? null,
          deleted_user_role: targetProfile?.role ?? null,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (auditErr) {
      console.error(`[AdminDeleteUser] Audit log failed (non-critical): ${(auditErr as Error).message}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    const error = err as Error;
    console.error(`[AdminDeleteUser] Unexpected error: ${error.message}`);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
