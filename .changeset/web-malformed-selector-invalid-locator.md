---
"@e2e-dev/web": patch
---

A selector the engine cannot parse is now `INVALID_LOCATOR` (category `test`, exit 1) instead of `ENGINE_FAILURE` (infrastructure, exit 3), through a locate, an action, `count()`, or `expect(...)`. Playwright parses a selector lazily inside the call that first uses it, so a malformed CSS selector, a stray `>>`, a bad `xpath=`, a `text=/.../` with an unterminated group, or an unknown engine name used to read as an engine fault and tell an agent to retry an infrastructure failure. The check runs before the stale and unactionable branches, so a selector whose text happens to contain "not found" or "not editable" is still a test-code mistake, and the raw Playwright error stays attached as the cause unless the action fills a secret. The message keeps Playwright's parse line, which names the offending selector.
