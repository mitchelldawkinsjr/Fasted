# SEOS Mode B smoke verified (#188)

**Date:** 2026-07-29  
**Issue:** [#188](https://github.com/mitchelldawkinsjr/Fasted/issues/188)

## Context

Fasted uses **SEOS local-first** implementation routing (`agents.implementation.strategy: local-first` in `.github/issue-bench.yml`):

```text
GitHub Actions → VPS control plane → Mac worker (primary) → Cursor Cloud (fallback)
```

Three harness modes on the Mac worker:

| Mode | `SEOS_WORKER_HARNESS` | Behavior |
|------|------------------------|----------|
| A | (worker off) | Control plane skips local worker; Cursor fallback from Actions |
| B | `shell` + dry command | Worker claims job, returns `no_changes`; control plane escalates to Cursor |
| C | `shell` + real command | Worker runs local harness with validation |

## Smoke result (Mode B)

Issue #188 exercised Mode B end-to-end:

1. **Actions enqueued** to the control plane (`POST /v1/jobs` via `scripts/route-implement.mjs`).
2. **Mac dry worker claimed** the implement job and returned `no_changes` (no local edits; harness not configured for real work).
3. **Cursor cloud agent started from `main`** with the full Fasted implement prompt (not a fake branch).
4. **Draft PR opened** by the Cursor fallback agent to close the smoke loop.

No product code changes were required. The full implement prompt is attached to control-plane jobs (`meta.implementPrompt`) so Cursor fallback preserves Fasted/SEOS rules instead of a thin stub prompt.

## References

- Config: `.github/issue-bench.yml`
- Router: `scripts/route-implement.mjs`
- Handoff builder: `scripts/build-cursor-handoff.mjs`
