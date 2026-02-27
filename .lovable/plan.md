

# Fix Budget Sync, Mobile Zoom, and Vibe Label

## 3 Issues to Fix

### 1. Budget shows zero after trip creation

**Root cause**: In `CreateTrip.tsx` line 178, the trip is inserted with `per_person_budget` set correctly, but `total_cost` is never set (defaults to `0` in the database). The dashboard reads `total_cost` to display funding info, so everything shows $0.

**Fix**: Calculate and include `total_cost` in the insert statement:
```
total_cost: form.perPersonBudget * (form.visibility === "public" ? form.maxSpots : form.groupSize)
```

This goes in `CreateTrip.tsx` around line 169-191 where the trip insert happens.

### 2. Mobile zoom on input focus

**Root cause**: The viewport meta tag in `index.html` doesn't prevent iOS Safari from zooming in when users tap on inputs (especially inputs with font-size < 16px).

**Fix**: Update the viewport meta tag to:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

### 3. Vibe card shows "Life" next to the emoji

**Root cause**: In `CreateTrip.tsx` lines 516-517, the label "Soft Life" is split by spaces. The code takes everything after the first word as the "emoji" display, so "Life" appears alongside the spa emoji. Only the first word "Soft" shows below.

**Fix**: Restructure `vibeOptions` in `src/lib/sample-data.ts` to have a separate `emoji` field, then update the vibe card rendering in `CreateTrip.tsx` to use it directly instead of the fragile string splitting.

Updated `vibeOptions`:
```typescript
{ value: "soft-life", label: "Soft Life", emoji: "🧖‍♀️", color: "secondary" },
// same pattern for all options
```

Updated card rendering (replacing lines 516-517):
```tsx
<span className="text-2xl">{v.emoji}</span>
<p className="text-sm font-medium mt-1">{v.label}</p>
```

## Files Changed

| File | Change |
|------|--------|
| `src/pages/CreateTrip.tsx` | Add `total_cost` to trip insert; update vibe card to use `v.emoji` |
| `src/lib/sample-data.ts` | Add `emoji` field to each vibe option |
| `index.html` | Add `maximum-scale=1.0, user-scalable=no` to viewport meta |

