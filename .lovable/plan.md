

# Add "Trips Being Planned" Social Proof Section

## Changes

### 1. Create `src/components/landing/TripsBeingPlanned.tsx`
A new component displaying a responsive grid of 4 placeholder trip cards:
- Section header: "Trips People Are Planning" with subtitle
- 4 cards with destination, friends count, and budget
- Each card has a travel emoji/icon, clean rounded design matching existing style
- Grid: 2 columns on mobile, 4 on desktop
- Uses existing `fadeUp` animation pattern, `Card`/`CardContent` components
- Background: `bg-foreground/[0.03]` to alternate with the plain "How It Works" section above

### 2. Edit `src/pages/LandingPage.tsx`
- Import `TripsBeingPlanned`
- Insert `<TripsBeingPlanned />` between the "How It Works" section (ends line 161) and the "AI Demo" section (starts line 163)

