

# Fix Draft Plan Item Management (Approve, Edit, Delete, Restore)

## Problems

1. **Misleading icon**: The CheckCircle icon next to draft items looks like a "done/delete" button. When clicked, it approves the item, which removes it from the draft list -- but the user thinks it got deleted.
2. **Approved items disappear**: Once approved, items vanish from the "Draft Plan" section but never appear in the main itinerary (different database tables). There's no "Approved" section showing them.
3. **No editing**: Users can't edit draft plan items (title, description, cost, time).
4. **No delete + restore**: There's no way to intentionally delete a draft item, and no way to bring back something that was removed.

## Plan

### 1. Replace the CheckCircle icon with proper action buttons

Each draft item will have two small buttons:
- **Thumbs-up or "Approve" button** with a clear label/tooltip (green checkmark with "Approve" text)
- **Trash icon** to delete/dismiss the item

### 2. Show approved items in a separate section

Add an "Approved" section below the "Draft Plan" section that displays items with `status = 'approved'`. This makes it clear that approving moves the item -- it doesn't delete it.

### 3. Add inline editing for draft items

When clicking a pencil/edit icon on a draft item, the row expands into editable fields (title, description, est_cost, time_block). Requires adding an UPDATE RLS policy or using an edge function since currently only organizers can update `trip_plan_items`.

### 4. Add delete with undo (soft delete)

- Clicking the trash icon sets the item status to `"dismissed"` instead of hard-deleting
- Add a small "Dismissed items" collapsible at the bottom with a "Restore" button on each
- Restoring sets the status back to `"draft"`

### 5. Database migration

Add the `"dismissed"` status support -- no schema change needed since `status` is a plain text column. Just need to update the RLS policy to allow organizers (and optionally creators) to update items to dismissed/draft status.

## Technical Details

### Files to modify

| File | Changes |
|------|---------|
| `src/components/tabs/PlanTab.tsx` | Replace CheckCircle with labeled Approve + Trash buttons; add Approved section; add Dismissed/restore section; add inline edit mode for drafts |

### New mutations needed in PlanTab

- `dismissDraft`: updates `trip_plan_items.status` to `"dismissed"`
- `restoreDraft`: updates `trip_plan_items.status` back to `"draft"`
- `updateDraft`: updates title, description, est_cost, time_block on a draft item

### Data filtering changes

Currently:
```
draftBudgetItems = draftItems.filter(d => !d.day_number && d.status === "draft")
draftItineraryItems = draftItems.filter(d => d.day_number && d.status === "draft")
```

Add:
```
approvedBudgetItems = draftItems.filter(d => !d.day_number && d.status === "approved")
approvedItineraryItems = draftItems.filter(d => d.day_number && d.status === "approved")
dismissedItems = draftItems.filter(d => d.status === "dismissed")
```

### UI layout for each draft item

```text
+-------------------------------------------------+
| Morning  |  Visit the Louvre                    |
|          |  Explore art galleries...            |
|          |  ~$45                                |
|          |  [Approve]  [Edit]  [Dismiss]        |
+-------------------------------------------------+
```

### Approved section appearance

Similar cards to draft but with a green "Approved" badge instead of "Draft", and only an "Undo" button to move back to draft.

### Dismissed section

A collapsible "Show dismissed items (3)" at the bottom with each item showing a "Restore" button.
