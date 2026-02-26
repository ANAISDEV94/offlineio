
# Clean Up Test Data for Trip

## What
Delete the existing test bookings (4 rows) and itinerary items (1 row) from trip `0683c76d-e390-4caf-b2ad-86556895f425` so the Plan tab renders empty -- showing only the Trip Planner card until a plan is generated.

## Steps

1. **Delete all rows from `bookings`** where `trip_id = '0683c76d-...'` (4 rows)
2. **Delete all rows from `itinerary_items`** where `trip_id = '0683c76d-...'` (1 row)

No code changes needed -- the conditional rendering logic already hides these sections when no data exists.

## Technical Detail
These are data deletions using the database insert/update/delete tool (not a migration). The `recalc_trip_total` trigger will automatically set `trips.total_cost` to 0 after the bookings are removed.
