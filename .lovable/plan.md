

## Plan: Add Debug Logging to Contribute Button

### Changes to `src/components/tabs/FundTab.tsx`

Update the `onClick` handler of the Contribute button (around lines 237-249) to add detailed debug logging:

1. **Before the request**: Log `tripId`, `contributionAmount`, and the final payload (`{ trip_id, amount_cents }`)
2. **After the response**: Log the full response object (`data` and `error`) from `supabase.functions.invoke`
3. **Redirect logic**: If `data?.url` exists, redirect. Otherwise, log the entire response as an error
4. **On catch**: Log the full error object (not just `err.message`)

No styling, backend, or structural changes.

### Technical Detail

Replace the button's `onClick` async handler body with:

```typescript
setIsContributing(true);
try {
  const payload = { trip_id: tripId, amount_cents: Math.round(Number(contributionAmount) * 100) };
  console.log("[Contribute] trip.id:", tripId);
  console.log("[Contribute] contributionAmount:", contributionAmount);
  console.log("[Contribute] payload:", payload);

  const { data, error } = await supabase.functions.invoke("create-checkout", { body: payload });

  console.log("[Contribute] full response data:", data);
  console.log("[Contribute] full response error:", error);

  if (error) throw error;

  if (data?.url) {
    console.log("[Contribute] redirecting to:", data.url);
    window.open(data.url, "_blank");
  } else {
    console.error("[Contribute] no url in response, full data:", data);
  }
} catch (err: any) {
  console.error("[Contribute] caught error object:", err);
  toast({ title: "Contribution failed", description: err.message, variant: "destructive" });
} finally {
  setIsContributing(false);
}
```

### Files Modified
| File | Change |
|------|--------|
| `src/components/tabs/FundTab.tsx` | Add debug console.log statements to Contribute button handler |

