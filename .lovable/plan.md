

# Fix "See It In Action" Demo Section — Stable Container

## Problem
The chat demo grows taller as messages appear, pushing the page content down and causing layout jank.

## Solution
Give the chat area a **fixed height** instead of `max-h-[420px]`. The container will always occupy the same space, and messages scroll internally. This is the simplest fix that solves the bouncing issue without a full redesign.

Additionally, add a **step progress indicator** at the bottom of the card to show demo progression, and use a slightly taller fixed height to comfortably fit the final plan card.

## Changes — `src/components/landing/AiPlannerDemo.tsx`

| What | Detail |
|------|--------|
| Chat area height | Replace `max-h-[420px]` with a fixed `h-[420px]` so the container never grows |
| Progress indicator | Add a small dot-based progress bar in the card footer showing current step out of total steps |
| Scroll behavior | Keep existing auto-scroll to bottom so new messages stay visible |
| Mobile | Use `h-[380px] sm:h-[420px]` for slightly smaller container on mobile |

Single file change. No layout or section restructuring needed.

