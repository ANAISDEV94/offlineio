

## Plan: Stabilize Stripe Contribution Flow (5 Phases)

### PHASE 1 — Enhanced Debug Logging (No Logic Changes)

**`src/main.tsx`** — Replace existing boot logs with richer diagnostics:
- Log `VITE_SUPABASE_URL`
- Extract and log the project ref from the URL (e.g. `seruyblflufhgandrxsf`)
- Check `supabase.auth.getSession()` and log whether a session exists
- Log first 12 chars of access_token if present

**`src/components/tabs/FundTab.tsx`** (Contribute button, ~line 237) — Before invoking, add:
- Log session exists (true/false) by calling `supabase.auth.getSession()`
- Log function name being invoked
- On catch, log the full error object with `JSON.stringify`

**`src/components/overview/FundingSummaryCard.tsx`** (handlePay, ~line 60) — Same logging pattern before its `supabase.functions.invoke` call.

Redeploy both edge functions (no code changes to them yet).

---

### PHASE 2 — Disable JWT + Validate Env Vars

**`supabase/config.toml`** — Change `create-checkout` to `verify_jwt = false` (stripe-webhook already false).

**`supabase/functions/create-checkout/index.ts`** — At the top of the handler (before auth):
- Log whether `STRIPE_SECRET_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` exist
- If `STRIPE_SECRET_KEY` is missing, return `{ error: "STRIPE_SECRET_KEY not configured" }` with 500
- Keep existing auth code but wrap it: if auth fails, log warning but continue (temporarily allow unauthenticated to isolate Stripe vs auth)

Also fix the `stripe-webhook` import from `npm:@supabase/supabase-js` to `https://esm.sh/@supabase/supabase-js@2.57.2` for Deno compatibility.

**Frontend** — Change `window.open(data.url, "_blank")` to `window.location.href = data.url` in both FundTab and FundingSummaryCard for more reliable redirect.

Redeploy both functions.

---

### PHASE 3 — Re-enable Proper Auth

**`supabase/config.toml`** — Set `create-checkout` back to `verify_jwt = false` (per the signing-keys guidance, we validate in code instead).

**`supabase/functions/create-checkout/index.ts`** — Use `getClaims()` for JWT validation:
```typescript
const authHeader = req.headers.get("Authorization");
if (!authHeader?.startsWith("Bearer ")) {
  return _json({ error: "not_authenticated" }, 401);
}
const token = authHeader.replace("Bearer ", "");
const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
if (claimsErr || !claimsData?.claims) {
  return _json({ error: "not_authenticated" }, 401);
}
const userId = claimsData.claims.sub;
```

**`src/components/tabs/FundTab.tsx`** — Before invoke:
- Check `supabase.auth.getSession()`
- If no session, show toast "Please sign in to contribute" and return early
- Pass explicit Authorization header:
```typescript
const { data: { session } } = await supabase.auth.getSession();
if (!session) { toast({ title: "Please sign in to contribute" }); return; }
const { data, error } = await supabase.functions.invoke("create-checkout", {
  body: payload,
  headers: { Authorization: `Bearer ${session.access_token}` },
});
```

**`src/components/overview/FundingSummaryCard.tsx`** — Same session check and explicit header pattern.

Redeploy.

---

### PHASE 4 — Webhook Validation

**`supabase/functions/stripe-webhook/index.ts`** — Already validates signature. Changes:
- Fix import to use `https://esm.sh/` instead of `npm:`
- Add CORS headers that include `stripe-signature` (already present)
- Add startup log confirming `STRIPE_WEBHOOK_SECRET` is set
- Log event type on successful verification

Note: The user must confirm in Stripe Dashboard that the webhook URL is:
`https://seruyblflufhgandrxsf.supabase.co/functions/v1/stripe-webhook`
and that `checkout.session.completed` event is enabled.

The `STRIPE_WEBHOOK_SECRET` secret already exists in the project.

---

### PHASE 5 — Cleanup

Remove temporary debug logs from Phase 1 (keep only essential error logging).
Verify final behavior matches:
- No session → toast asking to sign in
- With session → Stripe Checkout opens via redirect
- Successful payment → webhook records in DB
- UI reflects updated amounts

---

### Files Modified

| File | Phases | Summary |
|------|--------|---------|
| `src/main.tsx` | 1, 5 | Boot diagnostics with session check |
| `src/components/tabs/FundTab.tsx` | 1, 2, 3, 5 | Debug logs, redirect fix, session gate + explicit auth header |
| `src/components/overview/FundingSummaryCard.tsx` | 1, 2, 3, 5 | Same as FundTab |
| `supabase/config.toml` | 2, 3 | Temporarily toggle verify_jwt, settle on false (validate in code) |
| `supabase/functions/create-checkout/index.ts` | 2, 3 | Env var checks, switch to getClaims() auth |
| `supabase/functions/stripe-webhook/index.ts` | 4 | Fix npm import, add startup log |

No UI styling changes. No database changes. No project ref changes.
