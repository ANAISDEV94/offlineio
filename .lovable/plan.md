

# Upgrade AI Trip Planner to Chat-Style Q&A Wizard

## What Changes

Replace the current form-based questionnaire in `AiTripPlanner.tsx` with a **chat-style, one-question-at-a-time wizard** that feels conversational and effortless. The backend and data flow stay the same -- only the Step 1 UI changes significantly.

---

## Chat Wizard Design (6 Questions)

The wizard presents questions one at a time in a chat bubble format. Each question appears as an "AI message," and the user's selection appears as a "user reply" bubble before the next question animates in.

| # | Question | Input Type | Answer Key |
|---|----------|-----------|------------|
| 1 | "What kind of stay are you feeling?" | Single-select pills: Budget, Mid-range, Luxury, Unique stays | `accommodation` |
| 2 | "What do you want to do there?" | Multi-select pills: Adventure, Culture, Food, Relaxation, Nightlife | `activities` |
| 3 | "How packed should your days be?" | Single-select pills: Packed schedule, Balanced, Relaxed | `pace` |
| 4 | "Any food preferences or dietary needs?" | Free text input (skip button) | `dietaryNeeds` |
| 5 | "Anything you absolutely must do or see?" | Free text input (skip button) | `mustSee` |
| 6 | "Any other special requests?" | Free text input (skip button) | `specialRequests` |

After question 6 is answered (or skipped), the "Generate My Plan" button auto-appears.

---

## UI Details

- **Chat bubbles**: AI questions appear left-aligned in a light card style. User answers appear right-aligned with primary background.
- **Pill buttons**: For single/multi-select, show horizontally wrapped pill buttons below the AI bubble. Selected pills get primary styling.
- **Multi-select**: A "Next" button appears once at least one option is selected.
- **Text inputs**: A compact input with send button. "Skip" link for optional questions.
- **Auto-scroll**: Each new question scrolls into view with a brief animation (framer-motion fade+slide).
- **Progress dots**: Small dot indicators at the top showing 1-6 progress.

---

## Files to Modify

### `src/components/AiTripPlanner.tsx` (full rewrite of Step 1)
- Replace the flat form layout with a `chatMessages` state array that tracks `{role: "ai" | "user", content: string, questionIndex: number}`.
- Add a `currentQuestion` index (0-5) that advances as the user answers.
- Keep existing `generate()`, `saveDraft()`, and Step 2 (generating) / Step 3 (preview) exactly the same.
- Expand the `Answers` interface to include `dietaryNeeds` and `mustSee` fields.
- Wire the 6 answers into `answers_json` sent to the generate endpoint.

### `supabase/functions/generate-trip-plan/index.ts` (minor prompt update)
- Update the system prompt to reference the two new answer fields (`dietaryNeeds`, `mustSee`) from `answers_json` so the LLM uses them in planning.

No database changes, no new edge functions, no new dependencies needed.

---

## Technical Details

### Chat Message State
```text
chatMessages: Array<{
  role: "ai" | "user"
  content: string
  questionIndex: number
  options?: string[]       // for pill questions
  multiSelect?: boolean
}>
```

### Question Flow Logic
- `currentQuestion` starts at 0
- When user selects/submits an answer:
  1. Push a "user" message with their answer text
  2. Update the corresponding `answers` field
  3. Increment `currentQuestion`
  4. Push the next "ai" question message (with slight delay for natural feel)
- After question 5 (index 5) is answered, show "Generate My Plan" button

### Animation
- Each new chat bubble uses framer-motion `initial={{ opacity: 0, y: 12 }}` / `animate={{ opacity: 1, y: 0 }}`.
- Auto-scroll to bottom of chat container via `useRef` + `scrollIntoView`.

### Progress Indicator
- 6 small dots at the top of the sheet, filled up to `currentQuestion`.

