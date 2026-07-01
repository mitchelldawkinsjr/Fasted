# Issue #79 — Build your own Fast=Journey

**Status:** Ready for implementation  
**Last updated:** 2026-06-30

## Goal

Users build their own fast as a **Journey** with custom phases. Each phase has explicit start/end dates and structured content that drives the **Today** daily plan (instructions, fast day, scripture, prayer). Fast = Journey.

The system reads phase content and **pulls together instructions of the day** — not just journey CRUD.

## Product decisions (locked)

| Topic | Decision |
|-------|----------|
| Phase type | **Template OR custom** — never hybrid on the same phase |
| Phase dates | **Contiguous** — no gaps; auto-chain in builder |
| Journey edits | Apply **today forward** only; past days/check-ins unchanged |
| Instructions | **Hybrid:** preset prose from schedule + food rules, optional overrides |
| Encouragement | **Hybrid:** derive from phase context first, fallback to generic pool |
| Phase summary | **Auto-generate** `scheduleSummary` for Phases page |
| Minimum content | **Schedule preset required** (keeps `isFastDay` / streaks consistent) |
| Free-text-only phases | **Not in v1** — use “Normal eating (whole phase)” preset instead |

## Data model

Custom phases store an **inline template bundle** (`CustomPhaseContent`). Do **not** reuse group `CommitmentDefinition` (that is covenant check-in tracking, not daily fasting instructions).

```ts
type CustomPhaseContent = {
  title: string;
  themeColor?: string;
  schedulePattern: SchedulePattern; // required
  allowed?: string[];
  avoid?: string[];
  beverages?: string[];
  dailyReadings?: string[];
  prayerFocus: string[]; // required, ≥1
  scriptureReference?: string;
  safetyNote?: string;
  dayInstructions?: {
    fast?: string[];
    nonFast?: string[];
    always?: string[];
  };
};

type JourneyPhase =
  | { order: number; templateId: string; startDate?: string; endDate?: string }
  | { order: number; startDate: string; endDate: string; content: CustomPhaseContent };
```

**Template phases:** `{ templateId, order }` only — dates computed from `durationDays` (existing behavior).

**Custom phases:** `{ content, startDate, endDate, order }` — no `templateId`.

## Schedule presets (builder UX)

Presets expand to existing `SchedulePattern` values:

| Preset | Pattern |
|--------|---------|
| Normal eating (whole phase) | `weekday-fast` with `fastDays: []` or dedicated `kind: 'normal-eating'` |
| Weekly fast day(s) | `weekday-fast` |
| Daniel fast (whole phase) | `consecutive-daniel` |
| Fast + prayer days | `weekday-with-prayer` |
| Advanced / rotating (v1.1 optional) | `rotating-weekly` |

## Daily plan pipeline

Custom phase → synthetic `FastPhaseTemplate` → existing `interpretPattern()` + `appendFoodRules()` → merge `dayInstructions` → `DailyFastPlan`.

```
finalInstructions = [
  ...generatedFromPattern,
  ...(dayInstructions.always ?? []),
  ...(isFastDay ? dayInstructions.fast : dayInstructions.nonFast) ?? [],
]
```

Built-in template journeys must continue to behave exactly as today.

## Encouragement

1. Try phase-aware encouragement (`schedulePattern` kind + `prayerFocus` / title, day index within phase)
2. Fallback to existing generic pool (by `fastType`, `isFastDay`, date rotation)

Custom phases do not use `legacyId`.

## Auto-generated schedule summary

`generateScheduleSummary(content)` — pattern description + food lists + daily readings. Stored on save (groups jsonb round-trip).

## Validation

- Custom phase: `schedulePattern` required, `prayerFocus.length >= 1`
- Each phase: `startDate <= endDate`
- Phases contiguous within journey (phase N+1 starts day after phase N ends)
- Journey has ≥1 phase
- No overlapping phase windows
- On edit: truncate/replace phases from **today** forward only

## Acceptance criteria

- [ ] **Unify phase data model** in `src/types.ts`: discriminated `JourneyPhase` (template vs custom with `CustomPhaseContent`). Backward compatible with `UserProgress.journeys` and Supabase `journeys.phases`.
- [ ] **Extend `JourneyBuilder.tsx`** for custom journey flow: name, start date, phases with dates, schedule presets, food/spiritual fields, optional instruction overrides. Persist via existing `saveJourney()` / `setActiveJourney()` — **no** `saveCustomJourney()`.
- [ ] **Update phase resolution** in `src/lib/journey.ts` (`getJourneyPhaseWindows`, `getPhaseContextForDate`, `getPhasesForJourney`): explicit dates for custom phases; template `durationDays` fallback for template phases.
- [ ] **Daily plan generation** in `src/lib/dailyPlan.ts`: custom phases via synthetic template adapter + `dayInstructions` merge. Template journeys unchanged.
- [ ] **Encouragement + summary helpers** for custom phases.
- [ ] **UI:** `PhasesPage.tsx` (titles, date ranges, auto summary); `TodayFastCard.tsx` (generated plan); `JourneySettingsSection.tsx` (view/edit, today-forward save).
- [ ] **Groups:** `createGroup` / `groupJourneyToLocalJourney` round-trip extended phase jsonb.
- [ ] **E2e:** new `e2e/custom-journey.spec.ts` — create journey, Today instructions match commitments, persistence after reload.

## Implementation notes

- Extend existing code; do not add `CustomJourneyBuilder.tsx` or parallel storage APIs.
- `isValidJourney` / normalization in `journey.ts` accepts custom phase shape.
- `customJourneyImages.ts` / `resolvePhaseImagePath` fallbacks for custom phases without infographic.
- Prefer dedicated `SchedulePattern` kind `'normal-eating'` over empty `fastDays` (clearer summary + validation).

## Out of scope (follow-up issues)

- AI-generated commitment suggestions
- Image upload for custom phases
- Badge/achievement rules for custom journeys
- Leader dashboard changes beyond existing group journey storage
- Composable `PhaseCommitment[]` union (inline bundle is sufficient for v1)

## Suggested build order

1. Types + validation helpers
2. `journey.ts` phase windows + `PhaseContext`
3. Synthetic template adapter + `dailyPlan.ts` merge
4. `generateScheduleSummary` + encouragement helper
5. Builder presets + override fields
6. Phases / Today / Settings (today-forward edit)
7. Groups round-trip + e2e
