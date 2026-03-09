

# Fix Double Dollar Sign in Trip Cards

## Problem
The `DollarSign` icon is rendered next to `trip.budget` which already contains a `$` (e.g. `"$1,200"`), producing `$ $1,200`.

## Fix
In `src/components/landing/TripsBeingPlanned.tsx` line 103, replace the `<DollarSign>` icon with nothing — just show `{trip.budget} each` directly since the budget string already includes the dollar sign.

