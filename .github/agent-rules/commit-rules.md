# Commit and Git Rules

## Branch naming

`issue-{N}-{short-slug}` — e.g. `issue-28-menu-bar-title`

## Pull requests

- Title references the issue
- Body includes `Fixes #{N}`, summary, and test plan
- **Leave PR as draft** — do not run `gh pr ready` (Actions marks ready after review)
- One issue, one PR — keep diffs reviewable
- Do **not** merge the PR (human merges)

## Label handoff

| Event | Labels |
|-------|--------|
| Implementation starts | `agent-working` (Actions sets) |
| PR opened | Actions removes `agent-working`, adds `pr-opened`, starts review |
| Review complete | `review-clean` or `review-findings` |
| Agent blocked | remove `agent-working`, add `agent-failed` |

Agents must **not** manage review labels on success — GitHub Actions handles handoff.

## Commit messages

- Focus on why, not what
- Format: `fix(scope): description` or `feat(scope): description`
- PR fix commits: `fix(pr #N): summary`
- No `Co-authored-by` trailers for AI tools

## Issue comments

Post completion comment via:

```bash
gh issue comment <N> --repo mitchelldawkinsjr/Fasted --body-file /tmp/completion.md
```

Must include: PR link, summary, screenshots (if UI changed).

## Force push

Do not force-push. PR fix agent pushes normally to existing branch.
