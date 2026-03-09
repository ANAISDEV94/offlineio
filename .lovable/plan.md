
# Add Beta Notice to Fund Tab

## Change
Add a compact beta notice card at the top of the Fund tab (after the loading state check, before the first card). This mirrors the notice in Onboarding but is placed where users actually make payments.

## Location
`src/components/tabs/FundTab.tsx` — insert right after line 171 (`<div className="space-y-6">`) as the first child element.

## Code to add
```tsx
{/* Beta Notice */}
<div className="rounded-xl border border-border/40 bg-secondary/30 p-4 space-y-1.5">
  <p className="font-medium text-xs">🧪 Beta Notice</p>
  <p className="text-xs text-muted-foreground leading-relaxed">
    No real payments are processed. Use Stripe's test card:
  </p>
  <div className="text-xs text-muted-foreground font-mono bg-background/60 rounded-lg p-2.5 space-y-0.5">
    <p>Card: 4242 4242 4242 4242</p>
    <p>Exp: any future date · CVC: any 3 digits</p>
  </div>
</div>
```
