import { serve } from "http/server.ts";
import Stripe from "stripe";
import { createClient } from "supabase";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

// Removed PLAN_AMOUNTS hardcoded constant. Payment amounts now come exclusively
// from session.amount_total (what Stripe actually charged), so price changes in
// Stripe and in the listing_prices / pricing_plans DB tables are automatically
// reflected without any code change needed here.

/**
 * BUG-011: Record a Stripe event ID as processed (idempotency).
 * Returns true if the event was already processed (duplicate — skip).
 */
async function markEventProcessed(stripeEventId: string, eventType: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("stripe_processed_events")
    .insert({ stripe_event_id: stripeEventId, event_type: eventType });

  if (error) {
    // Unique constraint violation (code 23505) means already processed.
    if (error.code === "23505") return true;
    // Any other DB error — log and allow processing (safe over duplicate blocking).
    console.error(`[Webhook] Could not record event ${stripeEventId}: ${error.message}`);
  }
  return false;
}

/**
 * BUG-002 + BUG-003 + BUG-026: Unified commission processor via DB RPC.
 *
 * Replaces the previous inline generateSubscriptionCommissions() which:
 *   • Missed the platform fee record entirely (BUG-002)
 *   • Used floating-point JavaScript arithmetic (BUG-026)
 *   • Duplicated logic already in commission.service.ts (dual-path bug)
 *
 * The process_transaction_commissions() PL/pgSQL function (see
 * migrations_commission_fixes.sql) performs all arithmetic in NUMERIC,
 * resolves admin deterministically, inserts platform + realtor + director +
 * admin records atomically, and is idempotent via ON CONFLICT DO NOTHING.
 */
async function processCommissionsViaRpc(
  paymentId: string,
  realtorId: string,
  amount: number,
  type: string,
  listingId?: string | null
): Promise<void> {
  if (!paymentId || !realtorId || amount <= 0) return;

  const { data, error } = await supabaseAdmin.rpc("process_transaction_commissions", {
    p_transaction_id: paymentId,
    p_amount:         amount,
    p_type:           type,
    p_realtor_id:     realtorId,
    p_listing_id:     listingId ?? null,
  });

  if (error) {
    console.error(`[Webhook] Commission RPC error: ${error.message}`);
  } else {
    console.log(`[Webhook] Commissions processed via RPC for payment ${paymentId}:`, data);
  }
}

/**
 * Send in-app payment notification via notifications table.
 */
async function notifyPaymentSucceeded(userId: string, amount: number, type: string): Promise<void> {
  const { error } = await supabaseAdmin.from("notifications").insert({
    user_id: userId,
    title: "Payment Successful",
    message: `Your payment of $${amount.toFixed(2)} for ${type} was received.`,
    type: "payment",
    entity_id: null,
    read: false,
    created_at: new Date().toISOString(),
  });
  if (error) console.error(`[Webhook] Notification insert error: ${error.message}`);
}

serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!
    );

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

    // BUG-011: Global idempotency guard — deduplicate all event types using the
    // Stripe event ID. markEventProcessed returns true if already seen.
    const alreadyProcessed = await markEventProcessed(event.id, event.type);
    if (alreadyProcessed) {
      console.log(`[Webhook] Event ${event.id} already processed — skipping (idempotent)`);
      return new Response(JSON.stringify({ received: true, duplicate: true }), { status: 200 });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const meta = session.metadata || {};

        // ── Listing upgrade (one-time payment) ──────────────────────────────
        if (meta.type === "listing_upgrade") {
          const { listingId, upgradeType, userId } = meta;

          if (listingId && upgradeType) {
            const amountCents = session.amount_total ?? 0;
            const amount = amountCents / 100;

            // Single atomic RPC: UPDATE listings + INSERT payments +
            // INSERT listing_audit_log all within one DB transaction.
            // If any step fails, all three roll back — no partial writes.
            // Returns the new payment row ID for commission processing.
            const { data: upgradeRows, error: upgradeErr } = await supabaseAdmin
              .rpc("apply_listing_upgrade_atomic", {
                p_listing_id:            listingId,
                p_upgrade_type:          upgradeType,
                p_user_id:               userId ?? null,
                p_stripe_payment_intent: session.payment_intent as string,
                p_amount_cents:          amountCents,
              });

            if (upgradeErr) {
              console.error(`[Webhook] apply_listing_upgrade_atomic error: ${upgradeErr.message}`);
              break;
            }

            const paymentId = upgradeRows?.[0]?.payment_id ?? null;
            console.log(`[Webhook] Listing ${listingId} upgraded to ${upgradeType} (payment: ${paymentId})`);

            // Commissions for the upgrade payment
            if (paymentId && userId) {
              await processCommissionsViaRpc(paymentId, userId, amount, "listing", listingId)
                .catch(err => console.error(`[Webhook] Upgrade commission error: ${err.message}`));
            }

            if (userId) {
              await notifyPaymentSucceeded(userId, amount, `${upgradeType} listing upgrade`)
                .catch(err => console.error(`[Webhook] Notification error: ${err.message}`));
            }
          }
          break;
        }

        // ── Subscription checkout ────────────────────────────────────────────
        const userId = meta.userId;
        const planKey = meta.planKey;

        if (userId) {
          // BUG-001: Use upsert with onConflict='user_id' so that concurrent
          // webhook retries produce exactly one active subscription row.
          // The DB partial unique index (uq_subscriptions_user_active) enforces this
          // at the storage layer even if two requests race past this point.
          const { error: subError } = await supabaseAdmin
            .from("subscriptions")
            .upsert(
              {
                user_id: userId,
                plan: planKey || "starter",
                status: "active",
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id" }
            );

          if (subError) console.error(`[Webhook Sub Update Error] ${subError.message}`);

          // Activate profile
          await supabaseAdmin
            .from("profiles")
            .update({ status: "active" })
            .eq("id", userId);

          // Record the checkout payment and trigger commission processing.
          // Use session.amount_total (what Stripe actually charged) rather than
          // a hardcoded constant — price changes in DB/Stripe are picked up automatically.
          if (planKey && planKey !== "custom") {
            const planAmount = (session.amount_total ?? 0) / 100;
            if (planAmount > 0) {
              // Insert payment row first — its ID is the source_transaction_id
              // that the commission RPC uses to link and deduplicate records.
              const { data: pmtRow } = await supabaseAdmin
                .from("payments")
                .insert({
                  user_id:          userId,
                  type:             "subscription",
                  amount:           planAmount,
                  status:           "succeeded",
                  stripe_payment_id: (session.payment_intent as string) ?? session.id,
                  description:      `${planKey} subscription checkout`,
                })
                .select("id")
                .single();

              const paymentRowId = pmtRow?.id ?? null;

              // BUG-002 + BUG-003 + BUG-026: single RPC call covers all shares
              // (platform, director, admin, realtor) with NUMERIC arithmetic.
              if (paymentRowId) {
                await processCommissionsViaRpc(paymentRowId, userId, planAmount, "subscription").catch(
                  err => console.error(`[Webhook] Commission RPC failed: ${err.message}`)
                );
              }

              await notifyPaymentSucceeded(userId, planAmount, `${planKey} subscription`).catch(
                err => console.error(`[Webhook] Notification error: ${err.message}`)
              );
            }
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as any;
        const customerId = invoice.customer as string;
        const subscriptionId = typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;
        const stripeInvoiceId = invoice.id as string;

        // Idempotency: skip if this invoice was already recorded.
        // (The global event-id guard above covers retries; this covers duplicate invoice IDs.)
        const { data: existingPayment } = await supabaseAdmin
          .from("payments")
          .select("id")
          .eq("stripe_payment_id", stripeInvoiceId)
          .maybeSingle();

        if (existingPayment) {
          console.log(`[Webhook] invoice.paid ${stripeInvoiceId} already processed — skipping`);
          break;
        }

        const { data: subData } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .maybeSingle();

        if (subData) {
          const amount = invoice.amount_paid / 100;

          // Capture returned payment ID — needed for commission processing below.
          const { data: pmtRow, error: payError } = await supabaseAdmin
            .from("payments")
            .insert({
              user_id: subData.user_id,
              type: "subscription",
              amount,
              status: "succeeded",
              stripe_payment_id: stripeInvoiceId,
              description: `Invoice paid for subscription ${subscriptionId}`,
            })
            .select("id")
            .single();

          if (payError) console.error(`[Webhook Payment Insert Error] ${payError.message}`);

          if (invoice.period_end) {
            await supabaseAdmin
              .from("subscriptions")
              .update({
                next_billing_date:  new Date(invoice.period_end * 1000).toISOString(),
                current_period_end: new Date(invoice.period_end * 1000).toISOString(),
                status: "active",
              })
              .eq("user_id", subData.user_id);
          }

          // Process commission splits for this renewal payment.
          // Previously missing — recurring invoices created payment rows but
          // no commission records, leaving director/admin/platform shares unrecorded.
          if (pmtRow?.id) {
            await processCommissionsViaRpc(
              pmtRow.id,
              subData.user_id,
              amount,
              "subscription"
            ).catch(err => console.error(`[Webhook] Renewal commission error: ${err.message}`));
          }

          await notifyPaymentSucceeded(subData.user_id, amount, "subscription").catch(err =>
            console.error(`[Webhook] Payment notification failed: ${err.message}`)
          );
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: subscription.status === "active" ? "active" : "past_due",
            current_period_end: new Date((subscription as any).current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { data: cancelledSub } = await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id)
          .select("user_id")
          .maybeSingle();

        // Deactivate profile when subscription is cancelled
        if (cancelledSub?.user_id) {
          await supabaseAdmin
            .from("profiles")
            .update({ status: "suspended" })
            .eq("id", cancelledSub.user_id);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), { status: 200 });
  } catch (err) {
    const error = err as Error;
    console.error(`[Stripe Webhook Error] ${error.message}`);
    return new Response(`Webhook Error: ${error.message}`, { status: 400 });
  }
});
