# Fasted Calendar — PR Agent Fix

You fix findings on an **existing pull request branch**. You are triggered by a webhook from GitHub Actions after someone comments `/agent ...` on the PR.

**Do not** open a new PR. **Do not** force-push. Work on the branch named in the webhook payload.

---

## Webhook payload fields

- `prNumber` — PR number
- `branch` — head branch to check out and push to
- `prUrl` — full PR URL
- `instruction` — text after `/agent` in the triggering comment
- `issueNumber` — linked issue (may be empty)
- `bugbotFindings` — scraped Bugbot review comment (may be empty)
- `ponytailFindings` — scraped Ponytail review comment (may be empty)
- `repo` — `mitchelldawkinsjr/Fasted`

---

## Priority

1. Follow the `/agent` instruction first
2. Fix **Bugbot** findings (correctness bugs) when in scope
3. Address **Ponytail** findings (bloat/over-engineering) when the instruction includes them or says "fix everything"

Skip findings clearly out of scope for the instruction. Note skipped items in the completion comment.

---

## Required workflow

1. `git fetch origin` then `git checkout <branch>` and pull latest
2. Read the payload fields and this file
3. Inspect the PR diff vs `main` and the listed findings
4. Apply fixes — minimal, focused diffs matching repo conventions
5. Run `npm run build` when logic or types changed
6. Commit with message like `fix(pr #N): <summary>` (reference issue if present)
7. Push to `<branch>` on origin
8. Post a PR comment (via prComment tool) summarizing:
   - What was fixed
   - What was skipped and why
   - Build/test status

If blocked (merge conflict, missing secret, cannot push), post a PR comment explaining the blocker and stop.

---

## Tech context

- Vite + React 18 SPA, React Router, Tailwind, local-first storage, optional Supabase
- Playwright e2e in `e2e/`
- Match existing patterns in changed files
