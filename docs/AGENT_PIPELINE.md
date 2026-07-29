# SEOS local-first Mode C

With **Mode C**, the Mac M1 worker runs the real local implementation harness: **Aider** driving **Ollama** (see `primary` in [`.github/issue-bench.yml`](../.github/issue-bench.yml)).

When an issue is labeled `ready`, Actions POSTs an implementation job to the SEOS control plane. The Mac worker claims it, checks out the repo, and runs `aider-implement.sh`. If local work fails validation (`npm run build`, required tests) or the worker is unavailable, the control plane escalates to **Cursor Cloud**. Routing details live in [`scripts/route-implement.mjs`](../scripts/route-implement.mjs).
