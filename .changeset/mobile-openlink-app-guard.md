---
"@e2e-dev/mobile": patch
---

`device.openLink` refuses a link passed as `app` before it reaches the device: a `file:`, `data:`, `javascript:`, `view-source:`, `blob:`, or `filesystem:` link is `POLICY_DENIED`, any other link is `INVALID_ARGUMENT`, as for `openApp`. agent-device refuses `open <link> <url>` itself (`open <app> <url> requires an app target as the first argument`), so before this the call reached the runner as `ENGINE_FAILURE`.
