import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    // 1. Verify Stripe signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

    if (!signature || !webhookSecret) {
      return new Response("Missing signature or webhook secret", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return new Response(`Webhook signature invalid: ${err}`, { status: 400 });
    }

    console.log("[stripe-webhook] event.type:", event.type, "event.id:", event.id);

    // 2. Log ALL events to webhook_events (idempotent on stripe_event_id)
    const { data: existingEvent } = await admin
      .from("webhook_events")
      .select("id")
      .eq("stripe_event_id", event.id)
      .maybeSingle();

    if (existingEvent) {
      console.log("Duplicate event — already processed:", event.id);
      return _ok();
    }

    await admin.from("webhook_events").insert({
      stripe_event_id: event.id,
      event_type: event.type,
      payload: event.data.object as Record<string, unknown>,
      processed: false,
    });

    // 3. Handle specific event types
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event, admin);
    } else if (event.type === "payment_intent.succeeded") {
      await handlePaymentIntentSucceeded(event, admin);
    } else if (event.type === "payment_intent.payment_failed") {
      await handlePaymentIntentFailed(event, admin);
    } else if (event.type === "account.updated") {
      await handleAccountUpdated(event, admin);
    } else if (event.type === "checkout.session.expired") {
      console.log("Checkout session expired — logged, no action");
    }

    // Mark event as processed
    await admin
      .from("webhook_events")
      .update({ processed: true, processed_at: new Date().toISOString() })
      .eq("stripe_event_id", event.id);

    return _ok();
  } catch (error) {
    console.error("stripe-webhook unhandled error:", error);
    return new Response("Internal error", { status: 500 });
  }
});

async function handleCheckoutCompleted(event: Stripe.Event, admin: ReturnType<typeof createClient>) {
  const session = event.data.object as Stripe.Checkout.Session;
  const tripId = session.metadata?.trip_id ?? session.metadata?.tripId;
  const userId = session.metadata?.user_id ?? session.metadata?.userId;
  const amountCents = session.amount_total;

  if (!tripId || !userId || amountCents == null) {
    console.error("Missing metadata on session:", session.id);
    return;
  }

  const amountDollars = amountCents / 100;

  // Idempotent insert into payment_history (on stripe_session_id)
  const { data: existingPH } = await admin
    .from("payment_history")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (!existingPH) {
    await admin.from("payment_history").insert({
      trip_id: tripId,
      user_id: userId,
      amount: amountDollars,
      status: "paid",
      stripe_session_id: session.id,
      stripe_event_id: event.id,
    });
  }

  // Insert contribution row
  const paymentIntentId = typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id;

  if (paymentIntentId) {
    const { data: existingContrib } = await admin
      .from("contributions")
      .select("id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (existingContrib) {
      await admin
        .from("contributions")
        .update({ status: "succeeded", stripe_session_id: session.id, updated_at: new Date().toISOString() })
        .eq("stripe_payment_intent_id", paymentIntentId);
    } else {
      await admin.from("contributions").insert({
        trip_id: tripId,
        user_id: userId,
        amount: amountDollars,
        status: "succeeded",
        stripe_payment_intent_id: paymentIntentId,
        stripe_session_id: session.id,
      });
    }
  }

  // Update payments running total
  const { data: payment } = await admin
    .from("payments")
    .select("id, amount_paid, amount")
    .eq("trip_id", tripId)
    .eq("user_id", userId)
    .maybeSingle();

  if (payment) {
    const newAmountPaid = Math.min(Number(payment.amount_paid) + amountDollars, Number(payment.amount));
    const newStatus = newAmountPaid >= Number(payment.amount) ? "paid" : "partial";
    await admin.from("payments").update({ amount_paid: newAmountPaid, status: newStatus }).eq("id", payment.id);
  }

  // Call recalculate_trip_funding
  await admin.rpc("recalculate_trip_funding", { _trip_id: tripId });

  console.log(`checkout.session.completed: trip=${tripId} user=${userId} amount=$${amountDollars}`);
}

async function handlePaymentIntentSucceeded(event: Stripe.Event, admin: ReturnType<typeof createClient>) {
  const pi = event.data.object as Stripe.PaymentIntent;
  const tripId = pi.metadata?.trip_id;
  const userId = pi.metadata?.user_id;

  // Update contribution status
  if (pi.id) {
    await admin
      .from("contributions")
      .update({ status: "succeeded", updated_at: new Date().toISOString() })
      .eq("stripe_payment_intent_id", pi.id);
  }

  // Call recalculate if we have trip context
  if (tripId) {
    await admin.rpc("recalculate_trip_funding", { _trip_id: tripId });
  }

  // Store payment method details in user_payment_methods
  if (userId && pi.payment_method && pi.customer) {
    try {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method.id;
      const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer.id;
      const pm = await stripe.paymentMethods.retrieve(pmId);

      if (pm.card) {
        await admin
          .from("user_payment_methods")
          .upsert({
            user_id: userId,
            card_brand: pm.card.brand ?? null,
            card_last_four: pm.card.last4 ?? null,
            card_exp_month: pm.card.exp_month ?? null,
            card_exp_year: pm.card.exp_year ?? null,
            stripe_customer_id: customerId,
            stripe_payment_method_id: pmId,
            updated_at: new Date().toISOString(),
          }, { onConflict: "user_id" });
      }
    } catch (err) {
      console.error("Failed to store payment method:", err);
    }
  }

  console.log(`payment_intent.succeeded: pi=${pi.id} trip=${tripId}`);
}

async function handlePaymentIntentFailed(event: Stripe.Event, admin: ReturnType<typeof createClient>) {
  const pi = event.data.object as Stripe.PaymentIntent;

  if (pi.id) {
    await admin
      .from("contributions")
      .update({ status: "failed", updated_at: new Date().toISOString() })
      .eq("stripe_payment_intent_id", pi.id);
  }

  console.log(`payment_intent.payment_failed: pi=${pi.id}`);
}

async function handleAccountUpdated(event: Stripe.Event, admin: ReturnType<typeof createClient>) {
  const account = event.data.object as Stripe.Account;

  if (!account.id) return;

  const charges = account.charges_enabled ?? false;
  const payouts = account.payouts_enabled ?? false;

  await admin
    .from("stripe_connect_accounts")
    .update({
      charges_enabled: charges,
      payouts_enabled: payouts,
      onboarding_completed: charges && payouts,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", account.id);

  console.log(`account.updated: ${account.id} charges=${charges} payouts=${payouts}`);
}

function _ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
