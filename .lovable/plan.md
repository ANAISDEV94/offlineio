

# Fix: Page Not Starting at Top on Mobile

## Problem
Two issues are causing the page to not load at the top on mobile:

1. **`ScrollToTop` only fires on route changes** — On initial page load, there's no pathname change, so it never scrolls to top.
2. **`AiPlannerDemo.tsx` uses `scrollIntoView`** — When the AI chat demo auto-plays (triggered by `useInView`), the `scrollIntoView` call on line 110 can cause the entire page to scroll down on mobile, pulling the viewport to the middle of the page.

## Changes

### 1. `src/components/ScrollToTop.tsx`
- Remove the `[pathname]` dependency so it also fires on initial mount — use `useLayoutEffect` instead of `useEffect` to scroll before paint.

### 2. `src/components/landing/AiPlannerDemo.tsx`
- Change `chatEndRef.current?.scrollIntoView(...)` to use the parent container's `scrollTop` instead, so it only scrolls *within* the chat box and never moves the page itself.

