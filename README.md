# Fasted Calendar PWA

A spiritual fasting companion for **June 13 – December 19, 2026**. Open the app to see today’s fasting phase, scripture, prayer focus, encouragement, and journal your journey—with streaks, check-ins, badges, and optional group community features.

**Repository:** [github.com/mitchelldawkinsjr/Fasted](https://github.com/mitchelldawkinsjr/Fasted)

## Features

- **Today** — Current phase, fast-day instructions, scripture, prayer points, and daily encouragement
- **Calendar** — Color-coded plan from June 13 through December 19 with fast-day markers
- **Journal** — Daily reflections, prayer/gratitude/victory entries, search, and JSON/Markdown export
- **Progress** — Streaks, phase completion, badges, mood visualizer, and stats
- **Phases** — Overview of all 8 fasting phases with artwork
- **Journeys** — Built-in plan plus custom multi-phase journeys (Settings)
- **Groups** — Optional community groups with shared journal, prayer requests, and leader dashboard (requires cloud sign-in)
- **Settings** — Export/import journal, cloud sync, preferences, safety notes
- **PWA** — Installable and works offline after first load

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Cloud sync is optional. To enable it locally:

```bash
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or leave unset to hide sync UI
npm run dev
```

## Build & Preview

```bash
npm run build
npm run preview
```

### PWA updates and caching

Production caching headers and the in-app update prompt are documented in [docker/SETUP.md](docker/SETUP.md#vps-production). When a new version is available, a top toast prompts **Update available — Refresh**; tap Refresh to activate the waiting service worker and reload.

## Testing

```bash
npm run test:e2e
```

## Design

UI tokens and screen exports live in `.stitch/DESIGN.md` (Stitch project: **Biblical Fasting Journey**).

## Project Structure

```
src/
  components/   # UI (check-in, journal, groups, mood visualizer, layout)
  data/         # Phase templates, encouragements, badge definitions
  hooks/        # Progress, auth, journeys, groups
  lib/          # Storage, sync, daily plan, streaks, Supabase client
  pages/        # Today, Calendar, Journal, Progress, Phases, Groups, Settings
supabase/
  migrations/   # SQL for user_progress + groups/community tables
public/assets/  # Phase images, badges, icons
scripts/        # VPS deploy and Supabase setup helpers
docker/         # Deployment docs (SETUP.md)
e2e/            # Playwright specs
```

## Data & Storage

All progress (check-ins, journal entries, badges, settings, journeys) is stored locally in `localStorage`. No backend is required for offline use.

### Optional cloud sync (Supabase)

Sign in under **Settings → Cloud Sync** to back up your progress JSON to a self-hosted Supabase instance. Groups and community features also require sign-in.

See [`docker/SETUP.md`](docker/SETUP.md) for VPS + Docker + reverse-proxy deployment.

### Optional client telemetry

Auth and sync failures can be sent to `VITE_TELEMETRY_URL` or recorded in Supabase with `VITE_TELEMETRY_SUPABASE=true`. Apply the `telemetry_events` migration, then run `npm run telemetry:report` with a service role key to inspect recent events.

Push to `main` can trigger GitHub Actions deploy when repository secrets and variables are configured (see [`docker/SETUP.md`](docker/SETUP.md#github-actions)).

## Tech Stack

- Vite 5, React 18, React Router 6, Tailwind CSS 3, `vite-plugin-pwa`
- Supabase client for optional auth + cloud sync (`@supabase/supabase-js`)
- Playwright for e2e tests

## Health Note

Fasting is a spiritual discipline, not medical treatment. Consult a healthcare professional if you have medical concerns, especially for 24-hour or extended fasts.
