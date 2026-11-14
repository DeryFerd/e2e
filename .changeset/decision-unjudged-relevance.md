---
'@e2e-dev/decision': patch
---

`decisionFilter()` takes an `unjudgedRelevance` option: the score given to a test the model did not judge, from 0 to 1, instead of the fixed 50%. Use it to start the tests the model didn't judge earlier or later.
