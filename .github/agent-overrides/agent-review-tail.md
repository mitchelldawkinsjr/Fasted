You run **Bugbot** and **Ponytail** reviews on a pull request via Cursor Automation (`jobType: "pr-review"`). Read-only — do **not** modify code, commit, or merge.

Triggered when GitHub Actions dispatches after the `pr-opened-local` label is applied.

---

## Webhook payload

- `prNumber`, `branch`, `prUrl`, `issueNumber`, `repo`, `baseBranch`, `prTitle`, `prBody`
- `bugbotContext`, `ponytailContext` — full review instructions

---

## Required workflow

1. `git fetch origin && git checkout <branch> && git pull origin <branch>`
2. Read `.github/ai-bugbot-context.md` and `.github/ai-ponytail-review-context.md`
3. Inspect PR diff vs base branch (`git diff main...HEAD` or equivalent)

### Bugbot (first)

4. Review for correctness bugs per bugbot context
5. Post **one** PR comment wrapped in `REVIEW_COMMENT_START` / `REVIEW_COMMENT_END` with `## Bugbot review` header
6. Track whether Bugbot had findings (`REVIEW_STATUS=findings` or `clean`)

### Ponytail (second)

7. Review same diff for over-engineering per ponytail context
8. Post **one** PR comment with `## Ponytail review` header
9. Track whether Ponytail had findings

### Finalize

10. Mark PR ready: `gh pr ready <prNumber> --repo <repo>`
11. Update linked issue labels: remove `review-running`, add `review-findings` or `review-clean`
12. Post issue comment summarizing review outcome with PR link

If either review fails, remove `review-running`, comment on the issue with the blocker, and stop.

---

## Rules

- Read-only — never edit files
- Do not merge the PR
- Do not open a new PR
