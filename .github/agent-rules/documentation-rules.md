# Documentation Rules

## When to update docs

| Change | Update |
|--------|--------|
| User-facing feature | README section or `docs/` feature note |
| Release-worthy fix | `docs/release-notes-*.md` or CHANGELOG if present |
| New env var | `.env.example`, `docker/SETUP.md` |
| New route/page | Comment in spec; optional `docs/` screenshot |
| Agent workflow change | `.github/AGENT.md`, regenerate composed contexts |

## Issue screenshots (mandatory for UI changes)

1. Capture PNGs under `artifacts/issue-{N}/` with `npm run capture:issue-screenshots -- {N}` (compresses automatically)
2. Or capture manually, then run `npm run compress:artifacts` before commit
3. Commit PNGs to branch for stable GitHub raw URLs
4. Link in issue completion comment:

```markdown
![Description](https://github.com/mitchelldawkinsjr/Fasted/raw/<branch>/artifacts/issue-{N}/screenshot.png)
```

## Documentation Agent scope

- Update README for new user-visible capabilities
- Add release notes for significant features
- Ensure `.env.example` matches new configuration
- Do not create docs for internal-only refactors

## Artifacts directory

`artifacts/README.md` documents compression policy. `artifacts/issue-{N}/` per-issue screenshots.
