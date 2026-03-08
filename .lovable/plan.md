

# Add Beta Feedback Section to Landing Page

## Placement
Insert a new section in `src/pages/LandingPage.tsx` between the "Beta Payment Notice" section (ends ~line 298) and the "Waitlist" section.

## Content
- Title: "Help Us Improve Offline"
- Description: "Offline is currently in beta and we are actively improving the product. If you try it and have feedback, we would love to hear from you."
- Button: "Share Beta Feedback" linking to the Google Form in a new tab
- Import `MessageSquare` from lucide-react for the icon

## Design
- Clean card layout matching existing style (`rounded-2xl`, `bg-secondary/30`, `border border-border/40`)
- Centered text with `motion` fade-up animations consistent with other sections
- `MessageSquare` icon above the title
- Button styled as `rounded-full` primary button with `ExternalLink` icon
- Uses `<a>` with `target="_blank"` and `rel="noopener noreferrer"`

## Single file change
`src/pages/LandingPage.tsx` — ~20 lines inserted after the Beta Payment Notice section.

