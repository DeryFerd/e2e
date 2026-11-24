---
"e2e": patch
---

Ignore a token's JWT `exp` when it is already past or not a finite time, so the SpaceXSI login falls back to the server's `expires_in` instead of refreshing on every request.