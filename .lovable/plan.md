

## Plan: Fix 401 on create-checkout, Set Webhook Secret, Stabilize Stripe Flow

### Root Cause of 401
`supabase/config.toml` line 10 has `verify_jwt = true` for `create-checkout`. This means the Supabase gateway rejects requests before the function code ever runs. The function already validates JWTs manually via `getClaims()`, so the gateway check is redundant and broken (signing-keys issue).

### Changes

**A) Set STRIPE_WEBHOOK_SECRET**
- Use the `add_secret` tool to set `STRIPE_WEBHOOK_SECRET` = `whsec_PkTZKJo5e68odz10Jda2LYqT4DZxvOz9`
- Verify `STRIPE_SECRET_KEY`, `SUPABASE_URL`, and `SUPABASE_SERVICE_ROLE_KEY` are already present (they are, per the secrets list)

**B) Fix config.toml — the 401 fix**
Change `create-checkout` from `verify_jwt = true` to `verify_jwt = false`. The function already does manual JWT validation via `getClaims()`, so this is safe and correct per the signing-keys architecture.

| Line | Before | After |
|------|--------|-------|
| 10 | `verify_jwt = true` | `verify_jwt = false` |

**C) Fix FundTab.tsx `handlePay` (line 142-157)**
The `handlePay` function (used by the installment "Pay" buttons) does NOT pass an Authorization header and does NOT check for a session. It needs the same session gate and explicit header that the Contribute button already has.

```typescript
// Before (line 146-149):
const { data, error } = await supabase.functions.invoke("create-checkout", {
  body: { trip_id: tripId, amount_cents: amountCents },
});

// After:
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  toast({ title: "Please sign in to contribute", variant: "destructive" });
  setPayingAmount(null);
  return;
}
const { data, error } = await supabase.functions.invoke("create-checkout", {
  body: { trip_id: tripId, amount_cents: amountCents },
  headers: { Authorization: `Bearer ${session.access_token}` },
});
```

Also change `window.open(data.url, "_blank")` to `window.location.href = data.url` for reliable redirect (line 151).

**D) Add diagnostic logs to create-checkout edge function**
Add logs for:
- Whether Authorization header exists
- Whether user resolved successfully
- The resolved userId and trip_id

(Most of these logs already exist in the current code -- just need to add one for "Authorization header present" at the top.)

**E) Verify stripe-webhook implementation**
The current implementation already:
- Reads `STRIPE_WEBHOOK_SECRET` from `Deno.env.get()`
- Verifies signature via `stripe.webhooks.constructEvent()`
- Returns 200 on success, 400 on signature failure
- Logs event type on success

Add one additional log: log `event.type` after successful signature verification.

**F) Redeploy both functions**

### Files Modified

| File | Change |
|------|--------|
| `supabase/config.toml` | `create-checkout` verify_jwt: true -> false |
| `src/components/tabs/FundTab.tsx` | Add session gate + auth header to `handlePay`, fix redirect |
| `supabase/functions/create-checkout/index.ts` | Add "Authorization header present" log |
| `supabase/functions/stripe-webhook/index.ts` | Add event.type log after signature verification |

### How to Verify After Deploy

1. **View backend function logs**: Open Lovable Cloud backend to see logs for each function invocation
2. **Test Contribute button**: Sign in, go to a trip, enter an amount, click Contribute. You should see Stripe Checkout open (no 401)
3. **Test webhook**: In Stripe Dashboard > Developers > Webhooks, click on the endpoint, then "Send test webhook" with event `checkout.session.completed`. You should see a 200 response
4. **Expected console logs on Contribute**:
   - `[Contribute] session exists = true`
   - `[Contribute] function = create-checkout`
   - `[Contribute] response data: { url: "https://checkout.stripe.com/..." }`
5. **Expected edge function logs**:
   - `[create-checkout] Authorization header present: true`
   - `[create-checkout] authenticated userId: <uuid>`
   - `[create-checkout] Stripe session created: cs_...`

