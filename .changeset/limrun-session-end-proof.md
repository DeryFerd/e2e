---
'@e2e-dev/limrun': patch
'@e2e-dev/mobile': patch
---

`@e2e-dev/limrun` fails a release the daemon could not confirm. `stopDriver` ran `agent-device daemon stop --json` and ignored the report, so a forced stop or a missing shutdown report counted as a clean release while the remote instance stayed up until its one-hour backstop, holding a device for the next run. It now applies the rule `@e2e-dev/mobile/lease` already enforces through `assertSessionsEnded`, which is exported from that subpath for a provider that runs its own daemon command, and `limrun()`'s peer floor on `@e2e-dev/mobile` rises to the release that carries the export.