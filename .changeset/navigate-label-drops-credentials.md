---
'e2e': patch
'@e2e-dev/core': patch
---

A `navigate` step label no longer shows the URL's credentials, query, or fragment. The recorded action keeps the URL it needs to replay, but the label, the trace page, and the step event now read it without the parts that can carry a credential the ledger has no entry for: an inline `user:password@host`, which is not a configured secret, or a magic-link token in the query. A relative navigation keeps the path it resolves against. This is the rule `device.openLink` step labels already follow.