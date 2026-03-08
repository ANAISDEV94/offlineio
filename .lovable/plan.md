

# Trip Drama Simulator Section

## What

A new interactive section inserted between the AI Demo section (line 191) and the Value Props section (line 193) on the landing page. Users input trip details and get a humorous simulated breakdown of group trip money drama.

## New File: `src/components/landing/TripDramaSimulator.tsx`

Self-contained component with:

- **Inputs**: Number of friends (slider or number input, 2-10), total trip cost (number input), "One person pays upfront" toggle (Switch)
- **State**: `friends`, `totalCost`, `onePersonPays`, `result` (null until simulated), animation state
- **"Simulate Trip" button** triggers the result display
- **Result generation**: Deterministic-random using the inputs to produce 4-5 humorous lines:
  - Splits cost per person, picks random names from a pool (Ashley, Maya, Samantha, Jordan, Keisha, etc.)
  - One person "owes $X", one "hasn't paid yet", one "dropped out", final line shows "You are now covering $Y" (inflated amount due to dropout + non-payment)
- **Result display**: Lines animate in staggered with `framer-motion`, each in a soft rounded card/bubble
- **Final message**: "This is exactly why Offline exists. Plan trips without the money drama."
- **CTA button**: "Start planning your trip instead" → navigates to `/auth`
- **Design**: Matches brand — `bg-secondary/20` background, primary-colored accents, rounded cards, `font-display` headings, motion fadeUp animations. Mobile-responsive single column.

## Edit: `src/pages/LandingPage.tsx`

- Import `TripDramaSimulator`
- Insert `<TripDramaSimulator />` wrapped in a styled section between lines 191 and 193

