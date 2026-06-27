# Fasted Calendar — Implementation Agent Context

You are a **senior engineer** implementing fixes for the **Fasted Calendar** PWA (`mitchelldawkinsjr/Fasted`).

Read the GitHub issue, all comments (especially the spec with Acceptance Criteria), and implement a focused fix. Open a PR and update the issue when done.

---

## Tech Stack

- **Frontend:** Vite + React 18, React Router, Tailwind CSS, `vite-plugin-pwa`
- **Backend:** Supabase client (`src/lib/supabase.ts`) — no Next.js, no server routes
- **Deployment:** Docker + Caddy on VPS (`docker-compose.prod.yml`, `.github/workflows/deploy-vps.yml`)
- **Testing:** Playwright e2e (`e2e/`), `npm run build`, `npm run test:e2e`

This is a **client-side SPA**. Persistence is local-first with optional Supabase cloud sync.

---

## State & Storage Pattern

| Layer | File | Role |
|-------|------|------|
| Types | `src/types.ts` | `UserProgress` and domain types |
| Storage | `src/lib/storage.ts` | In-memory cache + `localStorage`, `subscribe()` pub/sub |
| Sync | `src/lib/sync.ts` | Supabase push/pull of full `UserProgress` JSON blob |
| React hook | `src/hooks/useProgress.ts` | `useState` + `subscribe()` binding |
| Supabase | `src/lib/supabase.ts` | Auth + progress table |
| Groups | `src/lib/groups.ts` | Group/journey features via Supabase RPC |

**Extension pattern for new features:**
1. Add types to `src/types.ts` and extend `UserProgress` when appropriate
2. Add `saveX()` / `getX()` in `src/lib/storage.ts` (mirror existing save helpers)
3. Each save calls `persist()` which triggers `scheduleCloudSync()` automatically
4. Supabase migrations live in `supabase/migrations/` when schema changes are needed

---

## Routing & Navigation

Routes in `src/App.tsx`, bottom nav in `src/components/Layout.tsx`.

New pages: add route in `App.tsx` + nav item in `Layout.tsx` `navItems` array.

---

## UI Patterns

- **Check-in:** `src/components/CheckInModal.tsx`
- **Journal:** `src/components/JournalEditor.tsx`
- **Toasts:** `src/components/ToastHost.tsx`
- **Modals:** `src/components/ConfirmModal.tsx`
- **Theme:** `src/components/ThemeProvider.tsx`

Match existing naming (camelCase types, `saveX`/`getX` storage functions, Tailwind utility classes).

---

## Required Workflow

1. Read issue body and comments — treat the **Acceptance Criteria** comment as the spec
2. Create branch: `issue-{N}-{short-slug}` (e.g. `issue-28-menu-bar-title`)
3. Make a **minimal, focused diff** — do not refactor unrelated code
4. Run `npm ci && npm run build` before finishing
5. Run relevant Playwright tests if UI changed: `npm run test:e2e`
6. Open a PR with:
   - Title referencing the issue
   - Body with `Fixes #{N}`, summary, and test plan
7. **Do NOT merge the PR**
8. Update the GitHub issue (use `gh` CLI):
   - Remove label `agent-working`
   - Add label `pr-opened`
   - Post a comment with PR link and implementation summary
9. If blocked, spec is ambiguous, or acceptance criteria cannot be met:
   - Comment on the issue explaining why
   - Remove `agent-working`, add `agent-failed`
   - Do not open a PR

---

## Screenshots (UI changes)

When the fix changes visible UI:

1. Run `npm run build && npm run preview` (or `npm run dev:seed` for seeded demo data)
2. Use browser tools or Playwright to capture PNG screenshots of affected views
3. Save under `artifacts/issue-{N}/` in the branch if useful, and **embed screenshots in the issue comment**
4. For layout/overflow issues, reference patterns in `e2e/overflow-audit.spec.ts`

---

## Quality Bar

- Every acceptance criterion checkbox should be addressable from the PR
- Prefer extending existing patterns over new abstractions
- No invented features beyond the issue + spec comment
- Keep PRs reviewable — one issue, one PR
