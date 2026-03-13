import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return _json({ error: "not_authenticated" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return _json({ error: "not_authenticated" }, 401);
    }

    const userId = claimsData.claims.sub as string;
    const userEmail = claimsData.claims.email as string | undefined;

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const origin = req.headers.get("origin") || Deno.env.get("SITE_URL") || "";

    // Check existing
    const { data: existing } = await admin
      .from("stripe_connect_accounts")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing) {
      // Fully onboarded?
      if (existing.charges_enabled && existing.payouts_enabled && existing.onboarding_completed) {
        return _json({
          status: "complete",
          stripe_account_id: existing.stripe_account_id,
          charges_enabled: true,
          payouts_enabled: true,
          onboarding_completed: true,
        });
      }

      // Refresh from Stripe
      if (existing.stripe_account_id) {
        const acct = await stripe.accounts.retrieve(existing.stripe_account_id);
        const updated = {
          charges_enabled: acct.charges_enabled ?? false,
          payouts_enabled: acct.payouts_enabled ?? false,
          onboarding_completed: (acct.charges_enabled && acct.payouts_enabled) ?? false,
          updated_at: new Date().toISOString(),
        };
        await admin.from("stripe_connect_accounts").update(updated).eq("user_id", userId);

        if (updated.charges_enabled && updated.payouts_enabled) {
          return _json({ status: "complete", stripe_account_id: existing.stripe_account_id, ...updated });
        }

        // Generate account link for incomplete onboarding
        const link = await stripe.accountLinks.create({
          account: existing.stripe_account_id,
          refresh_url: `${origin}/settings?connect=refresh`,
          return_url: `${origin}/settings?connect=complete`,
          type: "account_onboarding",
        });

        return _json({ status: "pending", url: link.url, stripe_account_id: existing.stripe_account_id });
      }
    }

    // Create new Express account
    const account = await stripe.accounts.create({
      type: "express",
      email: userEmail,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    await admin.from("stripe_connect_accounts").insert({
      user_id: userId,
      stripe_account_id: account.id,
      account_type: "express",
      charges_enabled: false,
      payouts_enabled: false,
      onboarding_completed: false,
    });

    const link = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${origin}/settings?connect=refresh`,
      return_url: `${origin}/settings?connect=complete`,
      type: "account_onboarding",
    });

    return _json({ status: "created", url: link.url, stripe_account_id: account.id });
  } catch (error) {
    console.error("create-connect-account error:", error);
    return _json({ error: (error as Error).message }, 500);
  }
});

function _json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
