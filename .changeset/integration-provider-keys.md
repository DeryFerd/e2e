---
'e2e': patch
'@e2e-dev/core': patch
---

The token a hosted service is signed in with is redacted like a model provider's key. `BROWSERSTACK_ACCESS_KEY`, `CLOUDFLARE_API_TOKEN`, `E2B_API_KEY`, `EXPO_TOKEN`, `KERNEL_API_KEY`, `LIGHTPANDA_PAT`, `LIMRUN_API_KEY`, `LIM_API_KEY`, `LT_ACCESS_KEY`, `MOLI_PAT`, `NOTTE_API_KEY`, `REVYL_API_KEY`, and `SMOL_CLOUD_TOKEN` join the closed list of provider-key variables, so a service that quotes a rejected token back, or a lease whose CDP endpoint carries one and is serialized into a worker's environment, no longer reaches a report, a trace page, a log, or a text download as text. The list stays closed, so this is one entry per service that reads a token, not a pattern over names.