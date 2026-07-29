# Agent pipeline

Fasted Calendar uses a label-driven agent workflow for issue planning, implementation, and review. See [`.github/AGENT.md`](../.github/AGENT.md) for the full roster, CLI commands, and label state machine.

Implementation jobs can run on **Cursor Cloud** (default) or via **SEOS local-first** routing when configured in [`.github/issue-bench.yml`](../.github/issue-bench.yml).

## SEOS local-first modes

| Mode | Mac worker | Purpose |
|------|------------|---------|
| **A** | Off | Control plane enqueues; Cursor Cloud implements |
| **B** | Dry harness (`SEOS_WORKER_HARNESS=shell`) | Smoke: claim job, return `no_changes`, escalate to Cursor |
| **C** | Real local harness | Mac runs Aider + Ollama for implementation |

Flow: GitHub Actions → VPS control plane → Mac worker (when online) → Cursor Cloud fallback if local work fails validation or the worker is offline. The router is [`scripts/route-implement.mjs`](../scripts/route-implement.mjs).

## SEOS local-first Mode C

With **Mode C**, the Mac M1 worker runs the real local implementation harness: **Aider** driving **Ollama** (see `primary` in `.github/issue-bench.yml`, e.g. `qwen2.5-coder:32b-instruct-q4_K_M`).

When an issue is labeled `ready`, Actions POSTs an implementation job to the SEOS control plane. The Mac worker claims it, checks out the repo, and runs `aider-implement.sh` to apply changes locally. If the local agent finishes without passing validation (`npm run build`, required tests), or the worker is unavailable, the control plane escalates to **Cursor Cloud** with the full consumer implement prompt so fallback keeps Fasted/SEOS rules instead of a thin stub.

Mode C is for judging local model coding quality on real issues while preserving a reliable Cursor fallback path.
