# Issue and PR screenshots

PNG/JPEG captures from agent QA, Playwright runs, and manual verification live here, grouped by issue number (`artifacts/issue-{N}/`).

These files are **intentionally kept in git** so issue comments and PRs can link stable raw URLs. Before committing new screenshots, run:

```bash
npm run compress:artifacts
```

That re-encodes images in `artifacts/` and `docs/screenshots/` without growing any file. Use `npm run compress:artifacts:check` in CI to fail when unoptimized images are committed.
