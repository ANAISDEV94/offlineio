

## Plan: Add Boot-Time Debug Log and Verify Edge Function Deployment

### Problem
The frontend is already correctly wired to project `seruyblflufhgandrxsf` via auto-managed `.env` and `client.ts` files. If edge functions were deployed to a different project (`ajwc...`), that's a separate deployment -- the functions in THIS project's `supabase/functions/` folder are auto-deployed to `seruyblflufhgandrxsf`.

### Changes

**1. Add console log on app boot (`src/main.tsx`)**

Add a single debug log after imports to print the active Supabase URL:

```typescript
console.log("[App Boot] VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
```

This lets you verify in the browser console which project the client connects to.

**2. Re-deploy edge functions to this project**

Trigger redeployment of `create-checkout` and `stripe-webhook` to ensure they are live on `seruyblflufhgandrxsf` (not only on some other project).

### Files Modified
| File | Change |
|------|--------|
| `src/main.tsx` | Add one `console.log` line to print `VITE_SUPABASE_URL` at boot |

### No Changes To
- `.env` (auto-managed)
- `client.ts` (auto-generated)
- Edge function code (already correct)
- UI/styling

