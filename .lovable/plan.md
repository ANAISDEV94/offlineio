

# Add Scroll-to-Top on Route Change

Add a `ScrollToTop` component inside the `BrowserRouter` that calls `window.scrollTo(0, 0)` on every route change using `useLocation`.

## Changes

**New file: `src/components/ScrollToTop.tsx`**
- Uses `useEffect` + `useLocation` from react-router-dom to scroll to top on pathname change.

**Edit: `src/App.tsx`**
- Import and render `<ScrollToTop />` inside `<BrowserRouter>`, before `<Routes>`.

