

# AI Trip Planner Demo Section on Landing Page

## Concept

Add an interactive, scripted demo section between the "How It Works" and "Value Props" sections on the landing page. It shows a simulated conversation with the trip planner for a Miami Beach trip — pre-scripted messages that animate in sequence, giving visitors a feel for the real product without needing to sign up.

**Not** using the full `PromptInputBox` component from the prompt — it's a generic AI chat input with voice recording, search/think/canvas toggles that don't fit this context. Instead, building a lightweight, brand-styled chat demo that mirrors the actual `AiTripPlanner` wizard UX (question → pill answer → next question → generated plan preview).

## Demo Flow (Scripted)

The demo auto-plays a conversation for a Miami Beach girls' trip:

```text
AI: "What kind of stay are you feeling?"
    [Budget] [Mid-range] [Luxury] [Unique stays]
User: "Luxury" (auto-selected after delay)

AI: "What do you want to do there?"
    [Adventure] [Culture] [Food] [Relaxation] [Nightlife]
User: "Food, Relaxation, Nightlife"

AI: "How packed should your days be?"
User: "Balanced"

AI: ✨ Generating your Miami Beach plan...

→ Mini plan card appears showing:
  - Day 1: South Beach & Brunch ($85)
  - Day 2: Spa Day & Wynwood ($120)
  - Day 3: Sunset Cruise & Nightlife ($150)
  - Budget: ~$1,200/person
```

Messages animate in with staggered delays. The whole sequence replays on a loop or can be triggered by scroll-into-view.

## Design

- Chat container styled to match the app's brand (soft background, rounded bubbles, primary-colored user messages)
- Sits in a dark/contrasting section to stand out as a "product preview"
- Section header: "See it in action" with subtext "Plan a Miami Beach trip in under a minute"
- CTA at the bottom: "Try it yourself →" linking to `/auth`
- Mobile: single column, chat takes full width

## Files

| File | Change |
|------|--------|
| `src/components/landing/AiPlannerDemo.tsx` | New — self-contained scripted chat demo component |
| `src/pages/LandingPage.tsx` | Insert demo section between "How It Works" and "Value Props" |

## Component Structure (`AiPlannerDemo.tsx`)

- Uses `useState` + `useEffect` with `setTimeout` chains to animate messages
- `useInView` (intersection observer) triggers the animation when scrolled into view
- Each message is a `motion.div` with fade-up animation
- Pill buttons appear as static badges (not interactive — it's a demo)
- The "selected" pill highlights after a delay to simulate user interaction
- Plan result card appears at the end with a mini itinerary summary

No new dependencies needed — uses existing `framer-motion`, `lucide-react`, and shadcn components.

