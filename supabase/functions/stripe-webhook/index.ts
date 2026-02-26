// supabase/functions/stripe-webhook/index.ts
// POST — receives Stripe webhook events, verifies signature,
// records payments on checkout.session.completed.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Phase 4 — Startup log
console.log("[stripe-webhook] STRIPE_WEBHOOK_SECRET set:", !!Deno.env.get("STRIPE_WEBHOOK_SECRET"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // ---- 1. Verify Stripe signature (mandatory) ----
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      console.error("Missing stripe-signature header or STRIPE_WEBHOOK_SECRET");
      return new Response("Missing signature or webhook secret", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Webhook signature invalid: ${err}`, { status: 400 });
    }

    console.log("[stripe-webhook] Signature verified. event.type:", event.type);

    // ---- 2. Handle checkout.session.completed ----
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const tripId = session.metadata?.trip_id ?? session.metadata?.tripId;
      const userId = session.metadata?.user_id ?? session.metadata?.userId;
      const amountCents = session.amount_total; // Stripe returns cents

      if (!tripId || !userId || amountCents == null) {
        console.error("Missing metadata on session:", session.id);
        // Return 200 so Stripe doesn't retry — data issue, not transient.
        return new Response("Missing metadata — skipped", { status: 200 });
      }

      // Convert cents → dollars to match existing DB schema
      const amountDollars = amountCents / 100;

      // ---- 3. Idempotent insert into payment_history ----
      // Check for duplicate using stripe_session_id (no stripe_event_id column)
      const { data: existing } = await supabaseAdmin
        .from("payment_history")
        .select("id")
        .eq("stripe_session_id", session.id)
        .maybeSingle();

      if (existing) {
        console.log("Duplicate session — already processed:", session.id);
        return _ok();
      }

      const { error: historyErr } = await supabaseAdmin
        .from("payment_history")
        .insert({
          trip_id: tripId,
          user_id: userId,
          amount: amountDollars,
          status: "paid",
          stripe_session_id: session.id,
        });

      if (historyErr) {
        console.error("Insert payment_history failed:", historyErr);
        return new Response("Database error", { status: 500 });
      }

      // ---- 4. Update the member's running total in payments ----
      const { data: payment } = await supabaseAdmin
        .from("payments")
        .select("id, amount_paid, amount")
        .eq("trip_id", tripId)
        .eq("user_id", userId)
        .maybeSingle();

      if (payment) {
        const newAmountPaid = Math.min(
          Number(payment.amount_paid) + amountDollars,
          Number(payment.amount),
        );
        const newStatus = newAmountPaid >= Number(payment.amount) ? "paid" : "partial";

        const { error: updateErr } = await supabaseAdmin
          .from("payments")
          .update({
            amount_paid: newAmountPaid,
            status: newStatus,
          })
          .eq("id", payment.id);

        if (updateErr) {
          console.error("Update payments failed:", updateErr);
          // Don't return 500 — the payment_history row is already written,
          // so retrying would hit the idempotency guard. Log and continue.
        }
      }

      console.log(
        `Payment recorded: event=${event.id} trip=${tripId} user=${userId} amount=$${amountDollars}`,
      );
    }

    return _ok();
  } catch (error) {
    console.error("stripe-webhook unhandled error:", error);
    return new Response("Internal error", { status: 500 });
  }
});

function _ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
