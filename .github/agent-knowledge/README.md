# Agent Knowledge Base

Lessons learned from shipped work, failed deploys, and CI regressions. Agents should read recent entries in [AGENT.md](../AGENT.md) before starting complex tasks.

## When to add an entry

- Post-deploy health check failure
- Recurring CI failure pattern (overlay, visual, a11y)
- Architecture decision that should guide future specs
- Agent mistake that a rule update would prevent

## Template

Copy [`TEMPLATE.md`](TEMPLATE.md) to `YYYY-MM-DD-issue-NN.md` or run:

```bash
LESSON_TITLE="..." LESSON_BODY="..." ISSUE_NUMBER=88 node scripts/append-agent-lesson.mjs
```

## Recent lessons

_(Append newest entries at the top of this section during monthly review.)_
