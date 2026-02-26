

## Plan: Add Unmissable Boot Debug Logs

### Changes

**1. `src/main.tsx`** — Replace the existing single log with three detailed logs:

```typescript
console.log("[App Boot] VITE_SUPABASE_URL =", import.meta.env.VITE_SUPABASE_URL);
console.log("[App Boot] VITE_SUPABASE_ANON_KEY starts with =", (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "").slice(0, 12));
console.log("[App Boot] Edge invoke target =", import.meta.env.VITE_SUPABASE_URL + "/functions/v1/");
```

Note: The env var is `VITE_SUPABASE_PUBLISHABLE_KEY` (not `ANON_KEY`) per this project's `.env`. The third log constructs the full edge function base URL so you can see exactly where `supabase.functions.invoke` will send requests.

**2. `src/components/tabs/FundTab.tsx`** — In the Contribute button's `onClick` handler, add one log right before the invoke call (before the existing `console.log("[Contribute] payload:", payload)` line):

```typescript
console.log("[Contribute] invoking create-checkout on", import.meta.env.VITE_SUPABASE_URL);
```

### Files Modified
| File | Change |
|------|--------|
| `src/main.tsx` | Replace single log with 3 detailed boot logs |
| `src/components/tabs/FundTab.tsx` | Add 1 log before `supabase.functions.invoke` call |

No other logic, styling, or backend changes.
