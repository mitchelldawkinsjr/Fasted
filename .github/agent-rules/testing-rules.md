# Testing Rules

## CI requirements (blocking)

Every PR must pass:

- `npm run build`
- `npm run test:e2e` (desktop + mobile projects)
- `npm run compress:artifacts:check`
- Accessibility audit via `a11y-audit/` (in CI workflow)

Fix failures before opening or updating a PR.

## CI artifacts

Playwright/a11y/overflow debug files upload to GitHub Actions **only when a job fails**, with **3-day retention**. Download from the failed run's Artifacts section; green runs produce no artifacts.

Manual a11y-only rerun: Actions → **Accessibility Audit** → Run workflow.

## Playwright projects (`playwright.config.ts`)

| Project | Specs |
|---------|-------|
| `desktop` | Main e2e (journal, auth, streaks, etc.) |
| `mobile` | `e2e/overlay-scroll.spec.ts` only |
| `audit` | `e2e/overflow-audit.spec.ts` (advisory on CI) |
| `visual-*` | `e2e/visual/` baselines |

## When to add tests

| Change type | Required tests |
|-------------|----------------|
| New page/route | e2e spec covering navigation + core interaction |
| Modal/form layout | `overlay-scroll.spec.ts` or new mobile smoke case |
| Visual layout change | Update visual baselines: `npm run test:visual:update` |
| Storage logic | Unit-level coverage via e2e or existing spec extension |
| Auth/sync | `e2e/` auth specs |

## Commands

```bash
npm run test:e2e              # Blocking CI suite
npm run test:audit            # Full viewport overflow matrix (advisory)
npm run test:visual           # Visual regression
npm run test:visual:update    # Update baselines + compress
npm run compress:artifacts    # Before committing screenshots
```

## E2E fixtures

Shared helpers in `e2e/fixtures/`: `viewports.ts`, `seed-states.ts`, `routes.ts`, `stabilize.ts`, `supabase-mock.ts`, `overflow.ts`, `nav-overlap.ts`.

## Testing Agent checklist

When reviewing a PR for test coverage:

1. List changed files under `src/`
2. Verify e2e specs exist or were updated for user-visible changes
3. If UI components/pages changed, confirm `overlay-scroll` or relevant spec covers the flow
4. If only logic changed, confirm build passes and existing specs still apply
5. Note gaps in a PR comment — do not block merge for advisory gaps unless CI fails
