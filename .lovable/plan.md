

# Add Interactive App Tour / Onboarding Walkthrough

## What You'll Get
When a new user signs up and lands on the home screen for the first time (no trips yet), they'll see a beautiful, swipeable walkthrough that explains each feature of the app before they create their first trip.

## How It Works

### Welcome Tour Component
A full-screen, swipeable carousel that appears for first-time users (tracked via a flag in the `profiles` table). It walks through 7 slides:

1. **Welcome** -- "Welcome to DEPARTE! Your ultimate girls' trip planner."
2. **Plan** -- "Build your itinerary day by day and track your budget by category."
3. **Pay** -- "Split costs, set installment plans, and nudge your girls to pay up."
4. **Book** -- "Save flight, hotel, and activity links all in one place."
5. **Pack** -- "Get a smart packing checklist based on your destination and vibe."
6. **Fits** -- "Post your outfits, tag them by occasion, and react with emojis."
7. **Hype** -- "Countdown messages and payment reminders keep the energy up."

Each slide has a cute icon/emoji, a short headline, and a one-liner description -- all styled in the pastel aesthetic.

### Skip & Finish
- A "Skip" button on every slide
- A "Let's go!" button on the last slide
- Both dismiss the tour and mark it as seen so it never shows again

### Replay Option
- A small "How it works" link on the onboarding/home screen so users can replay the tour anytime

## Technical Details

### Database change
- Add an `onboarding_completed` boolean column (default `false`) to the `profiles` table via migration

### New files
- **`src/components/AppTour.tsx`** -- The swipeable tour carousel component using framer-motion for slide transitions. Reads/writes the `onboarding_completed` flag from the `profiles` table.

### Modified files
- **`src/components/Onboarding.tsx`** -- Show the `AppTour` overlay when `onboarding_completed` is false. Add a "How it works" link below the Create/Join cards to replay it.

