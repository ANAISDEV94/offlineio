

# Add "Send to Your Group Chat" Sharing Section

## Placement
After the AI Demo "See It In Action" section (line 192) and before the Trip Drama Simulator (line 194).

## New Component: `src/components/landing/ShareGroupChat.tsx`
A self-contained sharing section with:
- Title: "Planning a trip with friends?"
- Description text as specified
- "Send to your group chat" primary button that opens a popover/dropdown with 4 options:
  - **Copy link** — copies landing page URL (`https://offlineio.lovable.app`) to clipboard, shows toast confirmation
  - **WhatsApp** — opens `https://wa.me/?text={encodedMessage + url}`
  - **iMessage** — opens `sms:&body={encodedMessage + url}`
  - **Instagram DM** — copies message to clipboard + shows toast "Message copied — paste it in Instagram DM" (no direct DM API available)
- Default share message: `"We're planning our trip with Offline so no one has to chase people for money. Check it out. https://offlineio.lovable.app"`
- Uses existing `Popover` component for the sharing options menu
- Card layout with rounded edges, centered content, consistent with landing page style
- Uses `motion` and existing `fadeUp` variants for animation consistency
- Icons from lucide-react: `Share2`, `Copy`, `MessageCircle`, `Send`

## Edit: `src/pages/LandingPage.tsx`
- Import `ShareGroupChat`
- Insert `<ShareGroupChat />` between the AI Demo section and `<TripDramaSimulator />`

## Design Details
- Section uses `py-20 md:py-28` padding like other sections
- Card uses `rounded-2xl bg-secondary/30 border border-border/40` matching existing Beta Notice / Feedback cards
- Mobile-friendly: single column, full-width button, popover options stacked vertically

