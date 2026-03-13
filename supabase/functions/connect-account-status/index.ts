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

    const authUserId = claimsData.claims.sub as string;

    // Optional body with user_id
    let targetUserId = authUserId;
    try {
      const body = await req.json();
      if (body.user_id) targetUserId = body.user_id;
    } catch {
      // No body or invalid JSON — use auth user
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: account } = await admin
      .from("stripe_connect_accounts")
      .select("*")
      .eq("user_id", targetUserId)
      .maybeSingle();

    if (!account) {
      return _json({
        has_account: false,
        stripe_account_id: null,
        charges_enabled: false,
        payouts_enabled: false,
        onboarding_completed: false,
      });
    }

    // Refresh from Stripe if not fully onboarded
    if (!account.onboarding_completed && account.stripe_account_id) {
      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
        apiVersion: "2025-08-27.basil",
      });

      const acct = await stripe.accounts.retrieve(account.stripe_account_id);
      const updated = {
        charges_enabled: acct.charges_enabled ?? false,
        payouts_enabled: acct.payouts_enabled ?? false,
        onboarding_completed: (acct.charges_enabled && acct.payouts_enabled) ?? false,
        updated_at: new Date().toISOString(),
      };
      await admin.from("stripe_connect_accounts").update(updated).eq("user_id", targetUserId);

      return _json({
        has_account: true,
        stripe_account_id: account.stripe_account_id,
        ...updated,
      });
    }

    return _json({
      has_account: true,
      stripe_account_id: account.stripe_account_id,
      charges_enabled: account.charges_enabled,
      payouts_enabled: account.payouts_enabled,
      onboarding_completed: account.onboarding_completed,
    });
  } catch (error) {
    console.error("connect-account-status error:", error);
    return _json({ error: (error as Error).message }, 500);
  }
});

function _json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
