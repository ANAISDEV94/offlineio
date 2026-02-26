

## Plan: Simplify Auth Handling in create-checkout Edge Function

### What Changes

In `supabase/functions/create-checkout/index.ts`, simplify the authentication section (lines 25-44):

**Remove:**
- The explicit check for `Authorization` header existence (lines 26-29)
- The separate `authHeader` variable check

**Simplify to:**
- Create the Supabase client by forwarding `req.headers.get("Authorization")` directly (not "parsing" it -- just passing it through)
- Call `supabase.auth.getUser()` as the sole authentication gate
- If no user or error, return 401 with `{ error: "Unauthorized" }`

Since `verify_jwt = true` is already set in config.toml, the gateway pre-validates the JWT. The `getUser()` call then retrieves the full user object.

### Technical Detail

Replace lines 25-44 with:

```typescript
// ---- 1. Authenticate via Supabase auth context ----
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_ANON_KEY") ?? "",
  { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
);

const { data: { user }, error: authError } = await supabase.auth.getUser();

if (authError || !user) {
  return _json({ error: "Unauthorized" }, 401);
}
```

Everything else (body parsing, membership check, funding check, Stripe logic, response) stays identical.

### Files Modified
| File | Change |
|------|--------|
| `supabase/functions/create-checkout/index.ts` | Remove manual auth header check, simplify to `getUser()` as sole auth gate |

No frontend changes. No config.toml changes. No Stripe logic changes.
