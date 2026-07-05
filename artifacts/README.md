# Issue and PR screenshots

PNG/JPEG captures from agent QA, Playwright runs, and manual verification live here, grouped by issue number (`artifacts/issue-{N}/`).

These files are **intentionally kept in git** so issue comments and PRs can link stable raw URLs.

## Capturing screenshots (preferred)

Use the capture script — it writes PNGs and compresses them in one step so CI passes:

```bash
npm run dev:seed          # or npm run dev — in another terminal
npm run capture:issue-screenshots -- <issue>
```

Examples:

```bash
npm run capture:issue-screenshots -- 140
npm run capture:issue-screenshots -- 140 journal-focus-lightbox
npm run capture:issue-screenshots -- --list
```

Scenarios live under `scripts/lib/capture-scenarios/`. Register new UI flows there and map them to issue numbers.

## Manual capture or existing PNGs

If you capture screenshots another way, compress before commit:

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

Legacy one-off scripts (`scripts/capture-issue-*-screenshots.mjs`) remain for complex flows; prefer adding a scenario to `capture:issue-screenshots` when possible.
