# Releases & release notes

Merges to `main` **auto-deploy**. A GitHub Release does not redeploy — it labels a window of already-shipped PRs and generates notes from those PR titles.

## Flow

1. Merge PRs → each one deploys as usual  
2. When you want a named ship window (end of day/week/feature cluster), generate notes  
3. Optionally tag + publish a GitHub Release

## Commands

Preview / write `docs/release-notes-*.md` (no tag):

```bash
# First window (no v* tags yet) — set the day after the last hand-written notes
npm run release:notes -- --since 2026-06-28

# Later windows — defaults to latest v* tag
npm run release:notes
npm run release:notes -- --since v1.1.0
npm run release:notes -- --dry-run --since 2026-06-28
```

Tag `HEAD` on `main`, push the tag, create a GitHub Release, and write the docs file:

```bash
git checkout main && git pull
npm run release:create -- --tag v1.1.0 --since 2026-06-28
# optional draft:
npm run release:create -- --tag v1.1.0 --since 2026-06-28 --draft
```

Or from GitHub Actions: **Actions → Release notes → Run workflow**.

## What lands in the notes

1. **Prefer** each PR’s `## Release notes` body section (required by the PR template)
2. **Fall back** to the PR title when that section is missing (older PRs)
3. Categorize with the conventional-commit prefix on the title (`feat` → Added, `fix` → Fixed, …)

| `## Release notes` value | Result |
|--------------------------|--------|
| User-facing bullets | Copied into Added/Fixed/Changed |
| `None` / `Internal only` | Listed under Internal |

Keep PR titles conventional and write clear `## Release notes` bullets — they become the release.

## Manual polish

After generation you can edit `docs/release-notes-*.md` for user-facing wording. Re-run with `--out` if you need a custom path.
