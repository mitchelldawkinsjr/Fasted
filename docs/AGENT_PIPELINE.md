## SEOS local-first Mode C

**Mode C** is the real local harness: `.github/issue-bench.yml` sets `agents.implementation.strategy: local-first`, GitHub Actions enqueues jobs on the VPS control plane, and the Mac worker (`mac-m1-max`) runs Aider with Ollama. Modes A and B are harness tests (Mac worker off, or dry harness) and do not activate this pipeline.

**Cursor fallback** is automatic **Cursor Cloud** dispatch through the control plane (`scripts/route-implement.mjs`, `scripts/build-cursor-handoff.mjs`) when the Mac worker is offline or local validation fails — not a local Cursor IDE install. Configure `CURSOR_API_KEY`, `GH_TOKEN`, and control-plane routing (`CONTROL_PLANE_URL`, `CONTROL_PLANE_TOKEN`) in GitHub Actions; defaults live in `.github/issue-bench.yml`.
