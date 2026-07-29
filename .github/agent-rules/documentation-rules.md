# Documentation Rules

## When to update docs

| Change | Update |
|--------|--------|
| User-facing feature | README section or `docs/` feature note |
| Release-worthy fix | Do **not** hand-edit release notes on every PR — ensure the PR title is release-ready (see below) |
| New env var | `.env.example`, `docker/SETUP.md` |
| New route/page | Comment in spec; optional `docs/` screenshot |
| Agent workflow change | `.github/AGENT.md`, regenerate composed contexts |

## Release notes (PR-based)

Merges to `main` auto-deploy. Release notes are generated later from **merged PR titles** for a ship window:

```bash
npm run release:notes -- --since 2026-06-28          # first window / no tags yet
npm run release:create -- --tag v1.1.0 --since 2026-06-28
```

See [`docs/RELEASE.md`](../../docs/RELEASE.md). Agents should **not** invent `docs/release-notes-*.md` mid-issue unless a human asked for a release.

**PR `## Release notes` sections become release bullets** (title is the fallback). Use plain language, or `None` for internal-only PRs.

## Issue screenshots (mandatory for UI changes)

1. Capture PNGs under `artifacts/issue-{N}/`
2. Run `npm run compress:artifacts` before commit
3. Commit PNGs to branch for stable GitHub raw URLs
4. Link in issue completion comment:

```markdown
![Description](https://github.com/mitchelldawkinsjr/Fasted/raw/<branch>/artifacts/issue-{N}/screenshot.png)
```

## Documentation Agent scope

- Update README for new user-visible capabilities
- Keep PR titles release-ready; do not write per-PR release note files
- Ensure `.env.example` matches new configuration
- Do not create docs for internal-only refactors

## Artifacts directory

`artifacts/README.md` documents compression policy. `artifacts/issue-{N}/` per-issue screenshots.
