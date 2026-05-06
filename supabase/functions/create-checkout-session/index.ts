import { serve } from "http/server.ts";
import Stripe from "stripe";
import { createClient } from "supabase";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const url = Deno.env.get("SUPABASE_URL") || "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || Deno.env.get("ADMIN_SERVICE_ROLE_KEY") || "";

const supabaseAdmin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    // Decode JWT locally — JWT uses base64url encoding, not standard base64.
    // Convert - → + and _ → / and add = padding before calling atob().
    let callerId: string | null = null;
    try {
      const token = authHeader.replace(/^Bearer /i, "");
      const parts = token.split(".");
      if (parts.length === 3) {
        const base64url = parts[1];
        const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
        const payload = JSON.parse(atob(padded));
        if (payload?.sub && (!payload.exp || payload.exp > Date.now() / 1000)) {
          callerId = payload.sub;
        }
      }
    } catch (_) { }

    if (!callerId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const body = await req.json();
    const origin = req.headers.get("origin") || "";

    // Callers may only create sessions for themselves unless they are admin.
    const requestedUserId = body.userId as string | undefined;
    if (requestedUserId && requestedUserId !== callerId) {
      const { data: callerProfile } = await supabaseAdmin
        .from("profiles")
        .select("role")
        .eq("id", callerId)
        .single();
      if (callerProfile?.role !== "admin") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        });
      }
    }

    // ── Listing upgrade (one-time payment) ────────────────────────────────
    if (body.type === "listing_upgrade") {
      const { listingId, upgradeType, userId, userEmail } = body;

      if (!listingId || !upgradeType || !userId) {
        throw new Error("Missing required parameters: listingId, upgradeType, userId");
      }

      const validUpgradeTypes = ["standard", "featured", "top"];
      if (!validUpgradeTypes.includes(upgradeType)) {
        throw new Error(`Invalid upgradeType: ${upgradeType}`);
      }

      let unitAmount: number | null = null;
      const { data: priceRow } = await supabaseAdmin
        .from("listing_prices")
        .select("price")
        .eq("type", upgradeType)
        .eq("is_active", true)
        .maybeSingle();

      if (priceRow?.price != null && priceRow.price > 0) {
        unitAmount = Math.round(Number(priceRow.price) * 100);
      } else {
        const envKey = `STRIPE_LISTING_${upgradeType.toUpperCase()}_PRICE_CENTS`;
        const envVal = Deno.env.get(envKey);
        unitAmount = envVal ? parseInt(envVal, 10) : null;
      }

      if (!unitAmount || unitAmount <= 0) {
        throw new Error(`Could not determine price for upgrade type: ${upgradeType}`);
      }

      const { data: callerSub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan")
        .eq("user_id", callerId)
        .eq("status", "active")
        .maybeSingle();

      if (callerSub?.plan === "starter") {
        unitAmount = Math.round(unitAmount * 0.5);
      }

      const TIER_LABELS: Record<string, string> = {
        top: "Top Pick",
        featured: "Featured",
        standard: "Standard",
      };
      const tierLabel = TIER_LABELS[upgradeType] ?? upgradeType;

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            unit_amount: unitAmount,
            product_data: {
              name: `${tierLabel} Listing Upgrade`,
              description: `Upgrade your listing to ${tierLabel} tier for increased visibility`,
            },
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${origin}/realtor/listings?upgrade=success&listing=${listingId}&tier=${upgradeType}`,
        cancel_url: `${origin}/realtor/listings?upgrade=cancelled`,
        customer_email: userEmail,
        metadata: { type: "listing_upgrade", listingId, upgradeType, userId },
      });

      return new Response(JSON.stringify({ url: session.url }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // ── Subscription checkout ─────────────────────────────────────────────
    const { planId, planKey, userId, userEmail, billingInterval } = body;

    let priceId = planId;

    // 1. Look up Stripe Price ID from DB (set via Admin → Pricing → Edit Details)
    if (!priceId && planKey) {
      const priceCol = billingInterval === "annual"
        ? "stripe_annual_price_id"
        : "stripe_monthly_price_id";

      const { data: planRow } = await supabaseAdmin
        .from("pricing_plans")
        .select(priceCol)
        .eq("slug", planKey)
        .maybeSingle();

      priceId = planRow?.[priceCol] || null;
    }

    // 2. Fall back to environment variable
    if (!priceId && planKey) {
      priceId = Deno.env.get(`STRIPE_${planKey.toUpperCase()}_PRICE_ID`);
    }

    if (!priceId) {
      throw new Error(`Price ID not found for plan: ${planKey || planId}. Set it in Admin → Pricing → Edit Details.`);
    }

    if (!userId) {
      throw new Error("Missing required parameter: userId");
    }

    const isStarterPlan = (planKey || "").toLowerCase() === "starter";
    const subscriptionMeta: Record<string, string> = {
      userId,
      planKey: planKey || "custom",
      ...(isStarterPlan ? { minimum_commitment_months: "12" } : {}),
    };

    const isInvitedFlow = body.invitedFlow === true;
    const successUrl = isInvitedFlow
      ? `${origin}/realtor/billing?session_id={CHECKOUT_SESSION_ID}&status=success&onboarded=true`
      : `${origin}/realtor/billing?session_id={CHECKOUT_SESSION_ID}&status=success`;
    const cancelUrl = isInvitedFlow
      ? `${origin}/pricing?invited=true&status=cancelled`
      : `${origin}/realtor/billing?status=cancelled`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: userEmail,
      metadata: {
        userId,
        planKey: planKey || "custom",
        ...(isStarterPlan ? { minimum_commitment_months: "12" } : {}),
      },
      subscription_data: {
        metadata: subscriptionMeta,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const err = error as Error;
    console.error(`[Checkout Session Error] ${err.message}`);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});