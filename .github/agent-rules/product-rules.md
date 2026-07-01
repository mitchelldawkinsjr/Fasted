# Product Rules

## Scope

- Implement only what the issue and spec comment describe
- Do not invent unrelated features, pages, or data models
- Group/community features require Supabase sign-in — note auth gating in specs
- No meal logging exists; food references are fasting-plan copy and journal `hungerNotes` only

## User-facing quality

- Copy should be encouraging and aligned with biblical fasting journey theme
- Mobile-first: bottom nav, modals, and forms must work on 390px viewports
- Offline-capable: core features work without sign-in via localStorage

## Acceptance criteria style

- Use `- [ ]` checkbox syntax
- Each criterion must be testable by a human reviewer
- Reference actual file paths, type names, and patterns from this repo
- Include edge cases implied by the issue

## Task breakdown (Planning Agent)

When generating specs, include a **Task Breakdown** section with checkboxes for:

- Database / Supabase migrations (if needed)
- Types and storage (`src/types.ts`, `src/lib/storage.ts`)
- API / Supabase client wiring
- React hooks
- UI components and pages
- Routing and navigation
- Validation and edge cases
- Tests (e2e, visual if UI)
- Documentation
- Deployment notes (if infra changes)
