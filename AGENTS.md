# AGENTS.md

## Cursor Cloud specific instructions

This is a **frontend-only** Vite + React + TypeScript PWA (the "Fasted Calendar" app). All user
progress is stored in `localStorage`; there is **no backend required** to run or test the app.
Supabase is only an *optional* cloud-sync feature (gated behind `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY`); leave those unset for normal local development and the sync UI stays
disabled.

### Services / commands

There is a single service (the Vite dev server). Standard commands live in `package.json`:

- Run (dev): `npm run dev` — serves on `http://localhost:5173`. For Playwright/headless use
  `npm run dev -- --host 127.0.0.1 --port 5173`.
- Typecheck / "lint": there is no separate lint script. Type checking is `npx tsc -b` (also run as
  part of `npm run build`).
- Build: `npm run build` (`tsc -b && vite build`); preview the prod build with `npm run preview`.
- E2E tests: `npm run test:e2e` (Playwright). The Playwright config auto-starts/reuses the dev
  server, so you don't need to start it manually first.

### Non-obvious notes

- Playwright browsers must be present: run `npx playwright install --with-deps chromium` once per
  fresh VM (not part of the update script).
- `npm run test:e2e`: the `e2e/overflow-audit.spec.ts` "Visual overflow audit" test currently
  **fails on a pre-existing CSS modal overflow issue** unrelated to environment setup. The 8
  `e2e/journal.spec.ts` tests (core journal functionality) pass and are the reliable signal that the
  environment works.
- Optional seeded data: `npm run dev:seed` (or `dev:seed:force`) sets `VITE_SEED_DATA=true` to
  pre-populate local progress for manual testing.
- The app is date-aware: the fasting plan window is June 13 – December 19, 2026, so the "Today"
  view depends on the current date falling in/around that range.
