
Objective: stabilize the contribution path so clicking Contribute reliably opens Stripe Checkout (no 401), webhook test events return 200, and successful payments update funding state in this Lovable Cloud backend.

What I found from the current code/state:
- `create-checkout` is already configured with `verify_jwt = false` in `supabase/config.toml`, so gateway-level JWT blocking should not be the primary issue now.
- Direct function call without auth returns `401 {"error":"not_authenticated"}` from function code, which means requests are reaching the function.
- Client boot logs show session is currently false in your preview, so unauthenticated usage is still likely triggering the observed 401 behavior.
- `stripe-webhook` currently inserts `stripe_event_id` into `payment_history`, but that column does not exist in the current table schema. This will fail webhook DB writes even when signature verification succeeds.

Implementation plan (single pass)

1) Client logging + strict auth gate in contribution flows
- File: `src/components/tabs/FundTab.tsx`
  - Add a mount-time debug block (via `useEffect`) to log:
    - `[App Boot] VITE_SUPABASE_URL=...`
    - whether supabase client object is initialized
  - In Contribute handler (and keep existing payment logic):
    - Call `supabase.auth.getSession()`
    - Log:
      - logged-in boolean
      - `session.user.id` (if present)
      - access token exists + token length (not token value)
      - payload `{ trip_id, amount_cents }`
    - If no session: stop request and toast exactly `Please sign in to contribute.`
    - Invoke with explicit `Authorization: Bearer ...` header
    - Keep redirect with `window.location.href = data.url`
- File: `src/components/overview/FundingSummaryCard.tsx`
  - Mirror the same auth+logging/header behavior so alternate “Pay” CTA cannot bypass the fix path.

2) Make `create-checkout` diagnostics definitive and CORS-safe
- File: `supabase/functions/create-checkout/index.ts`
  - At top of request:
    - log method
    - log auth-header present boolean
    - if bearer exists, log first 10 chars + token length only
  - Keep OPTIONS preflight and CORS headers on all responses.
  - Keep manual JWT validation (`getClaims`) and return clear 401 JSON when missing/invalid.
  - Add startup boolean log confirming `STRIPE_SECRET_KEY` presence.
  - Add/keep clear errors for missing env (`STRIPE_SECRET_KEY`, `SITE_URL` fallback handling as described below).

3) Ensure checkout URL construction is robust
- File: `supabase/functions/create-checkout/index.ts`
  - Validate base URL source:
    - prefer `origin` header when called from browser
    - fallback to `SITE_URL`
    - if both absent, return clear 500 JSON (`SITE_URL or request origin required`)
  - Keep response shape `{ url: checkoutUrl }`.

4) Webhook correctness + schema-compatible DB write
- File: `supabase/functions/stripe-webhook/index.ts`
  - Keep signature verification using `Deno.env.get("STRIPE_WEBHOOK_SECRET")`.
  - Keep 400 on invalid/missing signature; 200 on valid handled events.
  - Log:
    - signature verify success/failure
    - `event.type`
    - for `checkout.session.completed`: session id + amount
  - Fix DB write to match existing schema:
    - remove `stripe_event_id` insert (column absent)
    - idempotency guard using existing `stripe_session_id` (check before insert; if already exists, log duplicate and return 200)
  - Keep/update payment total update in `payments` table after history insert.

5) Secrets/backend alignment verification (same project)
- Confirm in this Lovable Cloud project:
  - `STRIPE_SECRET_KEY` present
  - `STRIPE_WEBHOOK_SECRET` present
  - `SITE_URL` present (add if missing)
  - backend-provided `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` available for functions
- No project switching, no local CLI, no unrelated UI changes.

6) Deployment and validation checklist you can follow immediately after implementation
- Redeploy path (Lovable Cloud backend UI):
  1. Open Backend
  2. Functions → `create-checkout` → save/deploy latest
  3. Functions → `stripe-webhook` → save/deploy latest
  4. Functions → Logs tab for each function
- Stripe test:
  - Stripe Dashboard → Webhooks → endpoint `.../stripe-webhook` → Send test event `checkout.session.completed`
- Expected success signals:
  - Browser console:
    - App boot URL log
    - logged-in/session metadata logs
    - payload log
    - response containing checkout `url`
  - Network:
    - `POST /functions/v1/create-checkout` returns 200 with `{ url: ... }`
  - `create-checkout` logs:
    - method POST
    - auth header present true
    - token prefix + length
    - authenticated user id
    - stripe session created
  - `stripe-webhook` logs:
    - signature verified
    - `event.type=checkout.session.completed`
    - session id + amount logged
    - payment history insert/payment update logs
  - Webhook HTTP result:
    - valid test event: 200
    - invalid signature test: 400

Files to change in this pass:
- `src/components/tabs/FundTab.tsx`
- `src/components/overview/FundingSummaryCard.tsx`
- `src/main.tsx` (only if needed for the supabase initialized boot log)
- `supabase/functions/create-checkout/index.ts`
- `supabase/functions/stripe-webhook/index.ts`
- `supabase/config.toml` only if drift is detected (target remains `verify_jwt = false` for `create-checkout`)
