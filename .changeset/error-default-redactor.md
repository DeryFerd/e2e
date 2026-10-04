---
"e2e": patch
---

Run-level errors are redacted with the run's secrets. `serializeError` fell
back to no redaction when a call site did not pass a redactor, and several did
not: a suite hook failure, engine disposal, a worker that reports a fatal error
or dies, an in-memory run's fatal, and the scheduler's own protocol errors. The
runner process also never seeded its ledger with the config's static secrets,
so an error it serialized before any session opened (a collection failure, a
provisioning failure) redacted against nothing. A message quoting a value the
app echoed could reach `report.json` and the GitHub reporter in the clear. The
process's secret ledger is now the default redactor and the runner seeds it
from the config, so those paths redact like the rest of the report.
