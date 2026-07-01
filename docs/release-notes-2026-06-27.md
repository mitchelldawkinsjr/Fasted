# Fasted Calendar — App Update Report

**Period:** June 25–27, 2026  
**Issues closed:** 26  
**Repo:** [mitchelldawkinsjr/Fasted](https://github.com/mitchelldawkinsjr/Fasted)  
**Production:** [fasted.360web.cloud](https://fasted.360web.cloud)

---

## Executive summary

This was a major release window. The app moved from a single-user fasting calendar to a **full spiritual companion PWA** with custom journeys, group community, richer journaling, Supabase cloud sync, and social login. Alongside that, a large **quality and automation layer** was added so future fixes ship through CI, automated review, and VPS deploy gates.

**In plain terms:** Fasted is no longer just “track my fast on a calendar.” You can build your own journey, journal food and fitness, join a group, sign in with Google/Facebook, and sync progress to the cloud — with many UI bugs fixed along the way.

**Technically:** PocketBase was replaced with self-hosted Supabase; journey state drives Today/Calendar/Progress; groups schema + RLS landed; auth was unified via `AuthProvider`; CI/e2e/security/a11y/audit workflows were added; Cursor cloud + local automation backup paths were wired.

---

## What users will notice first

### Sign in & account

| Issue | Lay terms | Technical |
|-------|-----------|-----------|
| **#50 Login problems** | No more cryptic “Load failed” when signing in. You get clear messages for bad password vs network problems. Sign-in still works if sync hiccups after login. | `useAuth` + retry/backoff; normalized errors; `getSupabaseConfigIssue()`; sync failures don’t block session |
| **#18 / #25 Social login** | Sign in with **Google** or **Facebook** (Apple was swapped out for Facebook). | `signInWithOAuth` in `sync.ts`; redirect handled by `onAuthStateChange` |
| **#37 Sign in for groups** | One consistent sign-in flow whether you’re syncing data or joining a group. | Unified auth path in `CloudSyncSection` / groups entry |
| **#53 Groups redirect loop** | `/groups` no longer spins forever or hammers the server when you’re logged in. | Shared `AuthProvider` context; `RequireAuth` waits for init; stale fetch guard in `useGroups` |

### Journeys & calendar

| Issue | Lay terms | Technical |
|-------|-----------|-----------|
| **#15 Journey system** | Create a **custom fasting plan** — pick phases, start date, name. Today, Calendar, and Progress follow *your* journey, not only the default 8-phase plan. | `useActiveJourney()`; journey-scoped plan dates; Settings journey builder |
| **#52 Custom journey bugs** | Custom journey name/dates show on Calendar; journey builder buttons no longer hide under the bottom nav on mobile. | Calendar/Phases copy from active journey; sticky footer + safe-area on builder modal |
| **#28 Menu bar title** | Header says **“Fasted”** instead of “Fasted Calendar.” | `pageTitles` / `AppHeader` defaults |
| **#41 Start date overflow** | Date pickers on Settings fit the screen on phones. | `.date-input` + overflow constraints |

### Journal

| Issue | Lay terms | Technical |
|-------|-----------|-----------|
| **#48 Food & Fitness types** | Two new journal types: **Food** (breakfast/lunch/dinner/snack) and **Fitness** (how you moved today). | Extended `SimpleJournalType`; `journalTags.ts`; editor/viewer + e2e |
| **#8, #10, #11, #16, #17** | Journal labels and flows cleaned up — “Daily Reflection,” mood journal naming, new reflection tab behavior. | Copy/routing updates across journal pages |
| **#33 / #34 Verse of the Day** | Prayer focus field renamed; hunger notes wording updated. | Field labels + schema copy |
| **#45 / #43 Date box overflow** | Journal date picker stays inside the card on narrow screens. | `overflow-hidden`, `min-w-0`, `.date-input` on `JournalEditor` |
| **#12 Check-in streak** | Streak count displays and persists correctly after check-ins. | Storage/progress fix for streak logic |
| **#39 Reminder time** | Reminder time control removed from Settings (was overflowing / out of scope). | UI removal |

### Groups & community

| Issue | Lay terms | Technical |
|-------|-----------|-----------|
| **#14 Multi-tenancy / groups** | Signed-in users can **create or join groups**, share journal entries, post prayer requests, and leaders get a **dashboard** with stats and moderation. | Supabase migration `20260628000000_groups.sql`; `/groups`, `/join/:code`, leader dashboard; RLS |
| **#32 RLS fix** | Creating a group as leader actually works (membership row inserts). | `group_memberships` FOR ALL policies for PostgREST |

### Branding

| Issue | Lay terms | Technical |
|-------|-----------|-----------|
| **#26 Logo & favicon** | New logo in header; new tab icon and PWA home-screen icons. | `public/assets/logo.png`, manifest icons, `AppHeader` |
| **#7 Main photo** | App display photo updated. | Asset update |

---

## Platform & infrastructure (mostly invisible to users)

### Cloud sync migration — **#19**

- **Lay:** Your progress can sync to the cloud on a more standard, self-hosted backend.
- **Tech:** PocketBase → **Supabase** (`@supabase/supabase-js`, `user_progress` table, RLS, VPS setup scripts, optional PocketBase→Supabase migration script).

### CI/CD quality gates — **#47**

Automated checks now run around every change:

| Workflow | What it does |
|----------|----------------|
| **CI** | `npm run build` + Playwright e2e on PRs |
| **Deploy** | Tests before SSH deploy to VPS |
| **Health check** | VPS ping every 30 min |
| **Security** | `npm audit` + secrets scan |
| **A11y audit** | axe on changed UI (advisory for now) |
| **Ponytail audit** | Monthly whole-repo bloat scan |

**Lay:** Broken builds are much less likely to reach production.

### Agent automation — **#30** + recent work

- **Cloud path:** `needs-spec` → spec comment → `ready` → Cursor cloud agent → draft PR → Bugbot + Ponytail → merge → deploy.
- **Local backup (new, in progress):** `ready-local`, `pr-opened-local`, `/agent` on PRs → Cursor Automation webhook when cloud quota is hit.

Issue **#54** documents the local automation pipeline (still being tested).

---

## Release notes (user-facing style)

### Added

- Custom **Journey System** — build and activate your own fasting plan
- **Food** and **Fitness** journal entry types
- **Groups** — create/join, prayer wall, shared journal, leader dashboard
- **Google & Facebook** social sign-in
- New **logo**, **favicon**, and PWA icons
- **Verse of the Day** labeling in journal

### Fixed

- Login errors now show helpful messages instead of “Load failed”
- Groups page redirect loop
- Custom journey calendar showing wrong plan name/dates
- Journey builder buttons overlapping bottom navigation
- Journal and Settings date inputs overflowing on mobile
- Check-in streak display/persistence
- Group creation RLS for leaders
- Unified sign-in for account + groups

### Changed

- Header title: **Fasted** (dropped “Calendar”)
- Reminder time removed from Settings UI
- OAuth: Facebook replaces Apple button
- Cloud backend: Supabase replaces PocketBase

### Internal / ops

- Full CI/CD pipeline with deploy gates and monitoring
- Automated Bugbot + Ponytail PR review
- Cursor agent issue implementation pipeline
- Local Cursor Automation backup path (webhook + GitHub Actions)

---

## Issues closed (index)

| # | Title | Closed |
|---|-------|--------|
| 4 | Test | Jun 26 |
| 7 | Update main photo for app display | Jun 27 |
| 8 | Update Journal Titles | Jun 26 |
| 10 | Journal Updates | Jun 27 |
| 11 | Mood Journal title changes | Jun 27 |
| 12 | Check in streak | Jun 27 |
| 13 | Under New Journal Reflection | Jun 27 |
| 14 | Multi-tenancy: groups & leader dashboards | Jun 27 |
| 15 | Journey system | Jun 27 |
| 16 | Also in Create New Journal Entry | Jun 27 |
| 17 | Create new reflection journal tab | Jun 27 |
| 18 | Social login (OAuth) | Jun 27 |
| 26 | Branding and Logo Updates | Jun 27 |
| 28 | Remove "Calendar" from menu bar | Jun 27 |
| 30 | Cursor cloud agent pipeline | Jun 27 |
| 37 | Fix: sign in for groups | Jun 27 |
| 39 | Reminder time visual overflow | Jun 27 |
| 41 | Start date input overflow | Jun 27 |
| 43 | Journal entry display issue | Jun 27 |
| 45 | Date box in journal entry | Jun 27 |
| 47 | Epic: CI/CD quality gates | Jun 27 |
| 48 | Add journal types (Food/Fitness) | Jun 27 |
| 50 | Login problems | Jun 27 |
| 52 | Custom journey calendar + builder nav | Jun 27 |
| 53 | Groups redirect loop | Jun 27 |

---

## Suggested review checklist

- [ ] Sign in with email, Google, and Facebook on production
- [ ] Create a custom journey → confirm Calendar shows *your* plan
- [ ] Add Food and Fitness journal entries; verify sync if logged in
- [ ] Create a group, join from second account, open leader dashboard
- [ ] Visit `/groups` on mobile — no redirect loop
- [ ] Confirm new logo/favicon on phone home screen (PWA install)
- [ ] Optional: run through local automation test (`ready-local` on a spec’d issue)

---

## Still open / follow-up

- **#54** — PR agent fix / local automation pipeline (testing in progress)
- **Branch protection** on `main` requiring CI / test (manual GitHub setting per #47)
- Production sign-in/sync manual verification noted open in Supabase migration PR

---

*Generated from closed GitHub issues and merged PRs, Jun 25–27, 2026.*
