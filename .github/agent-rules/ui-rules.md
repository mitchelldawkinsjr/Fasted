# UI Rules

## Component patterns

| Pattern | File |
|---------|------|
| Check-in modal | `src/components/CheckInModal.tsx` |
| Journal editor | `src/components/JournalEditor.tsx` |
| Journey builder | `src/components/JourneyBuilder.tsx` |
| Toasts | `src/lib/toast.ts` + `src/components/ToastHost.tsx` |
| Modals | `src/components/ConfirmModal.tsx` |
| Theme | `src/components/ThemeProvider.tsx` |
| App chrome | `src/components/AppHeader.tsx`, `src/components/AppLogo.tsx` |
| Auth gate | `src/components/RequireAuth.tsx` |

Journal field labels: `src/lib/journalTags.ts`. Design tokens: `.stitch/DESIGN.md`.

## Tailwind conventions

- Use existing utility classes and `stitch-card` patterns from surrounding components
- Match spacing, typography, and color tokens from `src/styles/globals.css`
- Do not introduce new CSS frameworks or component libraries

## Mobile layout rules

- Bottom nav in `src/components/Layout.tsx` — fixed at bottom on mobile
- **Hide bottom nav when modal open:** `body:has([aria-modal='true'])` in `globals.css`
- Modals must not stack on top of bottom nav; primary actions (Save, Submit) must be visible without scrolling on 390px viewports
- Journal editor: scrollable fields + pinned Save/Cancel bar (`JournalEditor.tsx`, `JournalPage.tsx`)

## Responsive review checklist

- [ ] No horizontal page scroll on mobile (except intentional `overflow-x-auto` tracks like badges)
- [ ] Modal content reachable without content hidden behind nav
- [ ] Touch targets adequate (44px minimum for primary actions)
- [ ] Visual consistency with Stitch design language

## Visual regression

- UI changes affecting layout: run `npm run test:visual` locally or rely on nightly `visual.yml`
- Overlay/scroll smoke: `e2e/overlay-scroll.spec.ts` runs on every PR (mobile project)
