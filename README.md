# Fasted Calendar PWA

A spiritual fasting companion for **June 13 – December 19, 2026**. Open the app to see today’s fasting phase, scripture, prayer focus, encouragement, and journal your journey—with streaks, check-ins, and badges to build gentle momentum.

**Repository:** [github.com/mitchelldawkinsjr/Fasted](https://github.com/mitchelldawkinsjr/Fasted)

## Features

- **Today** — Current phase, fast-day instructions, scripture, prayer points, and daily encouragement
- **Calendar** — Color-coded plan from June 13 through December 19 with fast-day markers
- **Journal** — Daily reflections with search and JSON/Markdown export
- **Progress** — Streaks, phase completion, badges, and stats
- **Phases** — Overview of all 8 fasting phases with artwork
- **Settings** — Export/import journal, optional cloud sync, preferences, safety notes
- **PWA** — Installable and works offline after first load

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

## Build & Preview

```bash
npm run build
npm run preview
```

## Design

UI/UX is synced from the Stitch project **Biblical Fasting Journey** (`projects/[stitch-project-id]`). Design tokens live in `.stitch/DESIGN.md` with full HTML exports per screen.

## Project Structure

```
src/
  components/   # UI components (cards, calendar, check-in, journal)
  data/         # Fasting plan phases and encouragements
  hooks/        # React hooks for local progress state
  lib/          # Date logic, daily plan, storage, streaks, badges
  pages/        # Today, Calendar, Journal, Progress, Phases, Settings
public/assets/  # Phase images and overview graphic
```

## Data & Storage

All progress (check-ins, journal entries, badges, settings) is stored locally in `localStorage`. No backend required for offline use.

### Optional cloud sync (Supabase)

Sign in under **Settings → Cloud Sync** to back up your progress JSON to a self-hosted Supabase instance.

```bash
cp .env.example .env.local
# Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

See [`docker/SETUP.md`](docker/SETUP.md) for VPS + Docker + NPM deployment.

Push to `main` triggers GitHub Actions deploy when `VPS_SSH_KEY`, `VPS_HOST`, and `VPS_USER` secrets are configured (same as your other deployed repos).

## Agent Package

This repo also includes `AGENTIC_PWA_BUILD_PROMPT.md` — the full product spec used to build the app.

## Health Note

Fasting is a spiritual discipline, not medical treatment. Consult a healthcare professional if you have medical concerns, especially for 24-hour or extended fasts.
