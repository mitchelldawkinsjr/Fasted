# Fasted Calendar — Implementation Agent Context

You are a **senior engineer** implementing fixes for the **Fasted Calendar** PWA (`mitchelldawkinsjr/Fasted`).

Read the GitHub issue, all comments (especially the spec with Acceptance Criteria), and implement a focused fix. Open a PR and update the issue when done.

**Do not consider the job finished until every step in Required Workflow and Completion Checklist is done.**

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
6. Open a PR with title referencing the issue, body with `Fixes #{N}`, summary, and test plan — **leave it as a draft** (Cursor opens draft PRs by default; do **not** run `gh pr ready`)
   - GitHub Actions removes `agent-working` and starts review automatically when the PR is opened (`.github/workflows/pr-review.yml`). Do **not** manage those labels yourself on success.
7. **Mandatory screenshots** if the fix touches any React component, page, CSS, or user-visible copy (see Screenshots section)
8. **Mandatory issue update** (use `gh` CLI — after PR is open; labels are already updated by Actions):
   ```bash
   gh issue comment <N> --repo mitchelldawkinsjr/Fasted --body-file /tmp/completion.md
   ```
   The completion comment must include: PR link, short summary, and screenshot markdown (if UI changed).
   Opening the PR with `Fixes #N` triggers **Bugbot + Ponytail** via `.github/workflows/pr-review.yml`; the workflow marks the PR ready when bots finish.
9. **Do NOT merge the PR**
10. If blocked, spec is ambiguous, or acceptance criteria cannot be met:
    - Comment on the issue explaining why
    - `gh issue edit <N> --remove-label agent-working --add-label agent-failed`
    - Do not open a PR

---

## Screenshots (mandatory for UI changes)

If you changed any file under `src/components/`, `src/pages/`, theme/CSS, or user-facing strings, you **must** capture and post screenshots. Passing e2e tests alone is not sufficient.

### Capture

1. Install Playwright browsers if needed: `npx playwright install chromium`
2. Run `npm run build && npm run preview -- --host 127.0.0.1 --port 4173` in the background
3. Capture PNGs with Playwright (preferred) or browser tools:
   ```bash
   mkdir -p artifacts/issue-{N}
   # Example: one-off script or npx playwright test with screenshot output
   ```
4. Save files under `artifacts/issue-{N}/` (e.g. `journal-form.png`, `journal-viewer.png`)
5. **Commit the PNGs to your branch** so they have stable raw GitHub URLs

### Post to the issue

GitHub issue comments cannot attach binary files directly via `gh issue comment`. Use committed image URLs:

```markdown
## Screenshots

![Journal form](https://github.com/mitchelldawkinsjr/Fasted/raw/<branch>/artifacts/issue-{N}/journal-form.png)
```

Or push PNGs, then reference the branch path in the issue completion comment. **Every UI change needs at least one screenshot in the issue comment.**

For layout/overflow issues, reference patterns in `e2e/overflow-audit.spec.ts`.

---

## Completion Checklist (verify before stopping)

You are **not done** until all applicable items are checked:

- [ ] Code implemented and pushed
- [ ] `npm run build` passes
- [ ] Relevant e2e tests pass (if UI changed)
- [ ] PR opened with `Fixes #{N}` (still **draft** — do not run `gh pr ready`; Actions clears `agent-working` on PR open)
- [ ] Screenshots committed (if UI changed) and linked in issue comment
- [ ] Issue comment posted with PR link + summary (+ screenshots)

---

## Quality Bar

- Every acceptance criterion checkbox should be addressable from the PR
- Prefer extending existing patterns over new abstractions
- No invented features beyond the issue + spec comment
- Keep PRs reviewable — one issue, one PR
