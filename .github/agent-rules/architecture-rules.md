# Architecture Rules

## Tech stack

- **Frontend:** Vite 5 + React 18, React Router 6, Tailwind CSS 3, `vite-plugin-pwa`
- **Backend:** Supabase client (`@supabase/supabase-js` via `src/lib/supabase.ts`) — no Next.js, no server routes
- **Deployment:** Docker + Caddy on VPS (`docker-compose.prod.yml`, `.github/workflows/deploy-vps.yml`, `scripts/deploy-vps.sh`)
- **Testing:** Playwright e2e (`e2e/`), `npm run build`, `npm run test:e2e`
- **CI:** GitHub Actions runs build + e2e + a11y on every PR (`.github/workflows/ci.yml`)

## State and storage pattern

| Layer | File | Role |
|-------|------|------|
| Types | `src/types.ts` | `UserProgress`, journeys, groups, domain types |
| Storage | `src/lib/storage.ts` | In-memory cache + `localStorage`, `subscribe()` pub/sub |
| Sync | `src/lib/sync.ts` | Supabase push/pull of full `UserProgress` JSON blob |
| React hook | `src/hooks/useProgress.ts` | `useState` + `subscribe()` binding |
| Auth hook | `src/hooks/useAuth.ts` | Supabase session state |
| Supabase | `src/lib/supabase.ts` | Client + table name constants |
| Groups | `src/lib/groups.ts` | Groups, memberships, shared journal, prayer requests |
| Journey | `src/lib/journey.ts`, `src/hooks/useActiveJourney.ts` | Active journey and phase resolution |

**Extension pattern for new local features:**

1. Add types to `src/types.ts` and extend `UserProgress` when appropriate
2. Add `saveX()` / `getX()` in `src/lib/storage.ts` (mirror `saveCheckIn`, `saveJournalEntry`)
3. Each save calls `persist()` which triggers `scheduleCloudSync()` automatically
4. No changes needed to `sync.ts` for new progress fields — they ride the existing `user_progress.data` JSON blob

**Extension pattern for new Supabase schema:**

- Add SQL migrations in `supabase/migrations/` (numbered timestamp prefix)
- Apply on VPS via `docker exec` psql (see `docker/SETUP.md`)
- Wire client code in `src/lib/supabase.ts` and the relevant lib file

**Storage keys:** `fasted-calendar-progress:guest` (unsigned) or `fasted-calendar-progress:{userId}` (signed in). Legacy key `fasted-calendar-progress` is migrated on first load.

## Data model (`src/types.ts`)

```ts
UserProgress = {
  checkIns: CheckIn[];
  journalEntries: JournalEntry[];
  badges: Badge[];
  settings: AppSettings;
  activeJourneyId: string;
  journeys: Journey[];
  updatedAt?: string;
}
```

## Routing and navigation

Routes in `src/App.tsx`, bottom nav in `src/components/Layout.tsx`:

| Route | Page |
|-------|------|
| `/` | TodayPage |
| `/calendar` | CalendarPage |
| `/journal` | JournalPage |
| `/progress` | ProgressPage |
| `/progress/badges` | BadgeGalleryPage |
| `/progress/mood` | MoodVisualizerPage |
| `/phases` | PhasesPage |
| `/groups` | GroupsHubPage |
| `/groups/:id` | GroupDetailPage |
| `/groups/:id/dashboard` | LeaderDashboardPage |
| `/join/:code` | JoinGroupPage |
| `/settings` | SettingsPage |

New pages: add route in `App.tsx` + nav item in `Layout.tsx` `navItems` (groups pages reached from Settings, not bottom nav).

Protected routes: wrap with `src/components/RequireAuth.tsx` when sign-in is required.

## Supabase migrations

| Migration | Purpose |
|-----------|---------|
| `20260627000000_initial.sql` | `user_progress` table, RLS |
| `20260628000000_groups.sql` | Organizations, groups, shared journal |
| `20260628000001_fix_membership_rls.sql` | Membership RLS fixes |

No Prisma. Auth via Supabase Auth (`auth.users`).

## Fasting plan data

- Phase templates: `src/data/phaseTemplates.ts`
- Daily plan generation: `src/lib/dailyPlan.ts`
- Badge definitions: `src/data/phaseAchievements.ts`
- Use `useActiveJourney()` for date-bound UI

## File upload (current state)

No image/photo upload exists. JSON journal backup import in `SettingsPage.tsx` via `FileReader.readAsText()`. For photos: note localStorage size limits or Supabase Storage + migration.

## Conventions

- Prefer extending `UserProgress` over new Supabase tables unless relational/group-scoped data is required
- camelCase types, `saveX`/`getX` storage functions
- Minimal focused diffs — one issue, one PR
- Match existing patterns in changed files before adding abstractions
