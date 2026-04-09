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
      console.error("[AdminDeleteUser] Missing env vars — set ADMIN_SERVICE_ROLE_KEY in Supabase secrets");
      return new Response(
        JSON.stringify({ success: false, error: "Server misconfigured: missing service role key" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    const supabaseAdmin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── Parse request body ─────────────────────────────────────────────────────
    const body = await req.json();
    const { userId, caller_token } = body;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required parameter: userId" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Accept caller_token from body (preferred) or Authorization header as fallback
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

    // ── Verify caller identity ─────────────────────────────────────────────────
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !caller) {
      console.error(`[AdminDeleteUser] Auth failed: ${authError?.message ?? "no user"}`);
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    // ── Verify caller is an admin ──────────────────────────────────────────────
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", caller.id)
      .single();

    if (callerProfileError || callerProfile?.role !== "admin") {
      console.warn(
        `[AdminDeleteUser] Forbidden — caller ${caller.id} has role "${callerProfile?.role ?? "unknown"}"`
      );
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

    // ── Pre-delete FK cleanup ──────────────────────────────────────────────────
    // Four categories of FK problem prevent auth.admin.deleteUser from working:
    //
    // A) Circular FK reference (must be broken first):
    //    profiles.subscription_id → subscriptions(id) ON DELETE SET NULL
    //    subscriptions.user_id    → profiles(id)       ON DELETE CASCADE
    //    When auth.users cascades to profiles, PostgreSQL cascades subscriptions
    //    (via user_id CASCADE), then tries to SET NULL back on the profile already
    //    being deleted — causing a circular conflict. Fix: null subscription_id first.
    //
    // B) ON DELETE SET NULL + NOT NULL (contradiction):
    //    payments.user_id, messages.sender_id, messages.recipient_id
    //    → PostgreSQL tries to SET NULL, the NOT NULL fires, rolls back the delete.
    //    Fix: DELETE these rows before the auth delete. Permanent fix: run
    //    migrations_delete_fk_fix.sql in Supabase SQL Editor (drops NOT NULL).
    //
    // C) No ON DELETE clause (defaults to NO ACTION / RESTRICT):
    //    disputes.resolved_by, payout_requests.approved_by/processed_by
    //    → PostgreSQL blocks the delete if any row references this user.
    //    Fix: nullify these rows BEFORE the delete.
    //
    // D) Properly configured FKs (no action needed — DB handles automatically):
    //    territories.director_id, leads.assigned_*, listings.realtor_id/approved_by,
    //    commissions.*, audit_logs.user_id, notifications.user_id, etc.
    //    All are ON DELETE SET NULL (nullable) or ON DELETE CASCADE.

    // ── Pre-delete: remove / nullify all FK references to this profile ────────
    // Must happen BEFORE auth.admin.deleteUser() or PostgreSQL will reject the
    // delete with "Database error deleting user".

    // Pre-delete cleanup — run each step individually and log errors so we can
    // see exactly which FK constraint is still blocking the deletion.
    //
    // STEP 0 — Break the circular FK before anything else:
    //   profiles.subscription_id → subscriptions(id)  ON DELETE SET NULL
    //   subscriptions.user_id    → profiles(id)        ON DELETE CASCADE
    //   When PostgreSQL cascades auth.users → profiles, it then cascades
    //   subscriptions (via user_id CASCADE), which fires ON DELETE SET NULL
    //   back onto the profile row that is mid-delete. Nulling subscription_id
    //   first removes the back-reference and eliminates the circular conflict.
    const cleanupSteps: Array<{ label: string; promise: Promise<{ error: { message: string } | null }> }> = [
      { label: "NULL profiles.subscription_id",    promise: supabaseAdmin.from("profiles").update({ subscription_id: null }).eq("id", userId) },
      { label: "DELETE payments",                  promise: supabaseAdmin.from("payments").delete().eq("user_id", userId) },
      { label: "DELETE messages (sender)",         promise: supabaseAdmin.from("messages").delete().eq("sender_id", userId) },
      { label: "DELETE messages (recipient)",      promise: supabaseAdmin.from("messages").delete().eq("recipient_id", userId) },
      { label: "NULL disputes.resolved_by",        promise: supabaseAdmin.from("disputes").update({ resolved_by: null }).eq("resolved_by", userId) },
      { label: "NULL payout_requests.approved_by", promise: supabaseAdmin.from("payout_requests").update({ approved_by: null }).eq("approved_by", userId) },
      { label: "NULL payout_requests.processed_by",promise: supabaseAdmin.from("payout_requests").update({ processed_by: null }).eq("processed_by", userId) },
    ];

    for (const step of cleanupSteps) {
      const { error: stepErr } = await step.promise as { error: { message: string } | null };
      if (stepErr) {
        console.error(`[AdminDeleteUser] Pre-delete step "${step.label}" failed: ${stepErr.message}`);
      } else {
        console.log(`[AdminDeleteUser] Pre-delete step "${step.label}" OK`);
      }
    }

    // ── Delete from auth.users (cascades to profiles via FK) ──────────────────
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error(`[AdminDeleteUser] auth.admin.deleteUser failed: ${deleteError.message}`);
      return new Response(
        JSON.stringify({ success: false, error: `Delete failed: ${deleteError.message}` }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Belt-and-suspenders: explicitly delete the profile row in case the
    // auth cascade didn't fire (e.g. profile was orphaned).
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    console.log(`[AdminDeleteUser] User ${userId} (${targetProfile?.email ?? "?"}) deleted by admin ${caller.id}`);

    // ── Audit log (non-critical — never block success response) ───────────────
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
      // Audit failures are logged but must NOT cause a failure response —
      // the user IS already deleted and that cannot be undone.
      console.error(`[AdminDeleteUser] Audit log insert failed (non-critical): ${(auditErr as Error).message}`);
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
