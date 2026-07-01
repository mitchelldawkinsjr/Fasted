# Issue and PR screenshots

PNG/JPEG captures from agent QA, Playwright runs, and manual verification live here, grouped by issue number (`artifacts/issue-{N}/`).

These files are **intentionally kept in git** so issue comments and PRs can link stable raw URLs.

## Before committing any screenshots

```bash
npm run compress:artifacts
```

That aggressively re-encodes images under:

- `artifacts/`
- `docs/screenshots/`
- `docs/journal-export-design/`
- `e2e/visual/` (Playwright visual baselines)
- `e2e/fixtures/` (test fixtures like meal photos)

CI runs `npm run compress:artifacts:check` and fails if images could be smaller.

Overflow audit output (`e2e/overflow-screenshots/`, gitignored) is saved as JPEG and compressed automatically after each audit run.
