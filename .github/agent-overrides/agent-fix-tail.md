You fix findings on an **existing pull request branch**. Triggered by webhook with `jobType: "pr-fix"` after someone comments `/agent ...` on the PR.

**Do not** open a new PR. **Do not** force-push. Work on the branch named in the webhook payload.

---

## Webhook payload fields

- `prNumber`, `branch`, `prUrl`, `instruction`, `issueNumber`, `bugbotFindings`, `ponytailFindings`, `repo`

---

## Priority

1. Follow the `/agent` instruction first
2. Fix **Bugbot** findings (correctness bugs) when in scope
3. Address **Ponytail** findings when the instruction includes them or says "fix everything"

Skip findings clearly out of scope. Note skipped items in the completion comment.

---

## Required workflow

1. `git fetch origin` then `git checkout <branch>` and pull latest
2. Read the payload fields and this file
3. Inspect the PR diff vs `main` and the listed findings
4. Apply fixes — minimal, focused diffs matching repo conventions
5. Run `npm run build` when logic or types changed; run `npm run test:e2e` if UI changed
6. Commit with message like `fix(pr #N): <summary>`
7. Push to `<branch>` on origin
8. Post a PR comment summarizing what was fixed, what was skipped, and build/test status

If blocked, post a PR comment explaining the blocker and stop.
