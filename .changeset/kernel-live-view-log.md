---
"@e2e-dev/kernel": patch
---

The Kernel provider no longer prints the browser's live view URL into the run log; it logs `browser <id>` alone. The view URL carries tokens that act on the session, and a run's log is often public CI output. The browser keeps its `e2e_run`, `e2e_target`, and `e2e_slot` tags, so Kernel's dashboard still finds it.
