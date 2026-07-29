# SEOS Mode B smoke verified (#188)

**Date:** 2026-07-29  
**Issue:** [#188](https://github.com/mitchelldawkinsjr/Fasted/issues/188)

## Context

SEOS local-first routing and harness modes are defined in `.github/issue-bench.yml`. Mode B (`SEOS_WORKER_HARNESS=shell` with a dry command) lets the Mac worker claim an implement job, return `no_changes`, and escalate to Cursor Cloud fallback.

## Smoke result

Mode B smoke passed (enqueue → dry claim → Cursor from `main` → draft PR).

No product code changes were required. The full implement prompt is attached to control-plane jobs (`meta.implementPrompt`) so Cursor fallback preserves Fasted/SEOS rules instead of a thin stub prompt.

## References

- Config: `.github/issue-bench.yml`
- Router: `scripts/route-implement.mjs`
- Handoff builder: `scripts/build-cursor-handoff.mjs`
