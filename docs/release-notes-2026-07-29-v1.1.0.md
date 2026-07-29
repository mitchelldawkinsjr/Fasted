# Fasted — Release Notes (v1.1.0)

**Period:** Jul 28, 2026  
**Tag:** v1.1.0  
**Production:** [fasted.360web.cloud](https://fasted.360web.cloud)

---

## What’s new

- **Plan My Food** — a new journal tab to plan meals for your fast ([#168](https://github.com/mitchelldawkinsjr/Fasted/pull/168))
- **Phase overview on Today** — tap the hero card to see where you are in your journey ([#162](https://github.com/mitchelldawkinsjr/Fasted/pull/162))
- **Daily reflection layout** — fields reordered and inputs enlarged so journaling is easier ([#165](https://github.com/mitchelldawkinsjr/Fasted/pull/165))
- **Check-in + daily reflection** — check-in and reflection work together in one flow ([#167](https://github.com/mitchelldawkinsjr/Fasted/pull/167))
- **Today’s Meditation in journal** — the verse matches what you see on the Today page ([#164](https://github.com/mitchelldawkinsjr/Fasted/pull/164))

## Under the hood

- Better error tracking so issues are easier to find and fix ([#158](https://github.com/mitchelldawkinsjr/Fasted/pull/158))
- Group invite codes are no longer stored in error breadcrumbs ([#176](https://github.com/mitchelldawkinsjr/Fasted/pull/176))
- Release notes are now built from merged PRs ([#182](https://github.com/mitchelldawkinsjr/Fasted/pull/182))

## Reliability

Deploy and test fixes so today’s features stay live ([#173](https://github.com/mitchelldawkinsjr/Fasted/pull/173), [#174](https://github.com/mitchelldawkinsjr/Fasted/pull/174), [#177](https://github.com/mitchelldawkinsjr/Fasted/pull/177), [#179](https://github.com/mitchelldawkinsjr/Fasted/pull/179)).

---

## Merged PRs

| PR | Title | Merged |
|----|-------|--------|
| [#162](https://github.com/mitchelldawkinsjr/Fasted/pull/162) | feat(today): add clickable phase overview on hero card (#159) | Jul 28, 2026 |
| [#167](https://github.com/mitchelldawkinsjr/Fasted/pull/167) | Integrate check-in with daily reflection (#160) | Jul 28, 2026 |
| [#164](https://github.com/mitchelldawkinsjr/Fasted/pull/164) | fix(journal): show read-only Today's Meditation verse matching Today page (#161) | Jul 28, 2026 |
| [#158](https://github.com/mitchelldawkinsjr/Fasted/pull/158) | feat: add Sentry client errors and structured logs | Jul 28, 2026 |
| [#173](https://github.com/mitchelldawkinsjr/Fasted/pull/173) | fix: unblock DailyReflection build for deploy | Jul 28, 2026 |
| [#174](https://github.com/mitchelldawkinsjr/Fasted/pull/174) | fix(e2e): unblock check-in streak deploy gate | Jul 28, 2026 |
| [#176](https://github.com/mitchelldawkinsjr/Fasted/pull/176) | fix(sentry): scrub join codes in nav breadcrumbs | Jul 28, 2026 |
| [#165](https://github.com/mitchelldawkinsjr/Fasted/pull/165) | feat(journal): reorder daily reflection fields and enlarge inputs (#163) | Jul 28, 2026 |
| [#168](https://github.com/mitchelldawkinsjr/Fasted/pull/168) | feat(journal): Plan My Food tab (#166) | Jul 28, 2026 |
| [#177](https://github.com/mitchelldawkinsjr/Fasted/pull/177) | fix(e2e): unblock main CI after journal reflection label changes | Jul 28, 2026 |
| [#179](https://github.com/mitchelldawkinsjr/Fasted/pull/179) | test(visual): refresh baselines after Plan My Food and journal layout | Jul 28, 2026 |
| [#182](https://github.com/mitchelldawkinsjr/Fasted/pull/182) | chore(release): generate notes from merged PR Release notes sections | Jul 29, 2026 |

---

*Polished from merged PRs for v1.1.0.*
