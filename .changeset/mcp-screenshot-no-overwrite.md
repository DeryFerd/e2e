---
'e2e': patch
---

The `e2e mcp` screenshot tool replaces a file only when that file is a screenshot. A `path` was written with `copyFileSync` over whatever was there, so a call could trade a project's own `.png` for a fresh capture: a committed visual-testing baseline, or an asset a page names. A file that already exists and does not start with the PNG signature is now `POLICY_DENIED` and left as it was, while saving again to a path that holds a screenshot still replaces it, which is how a fresh capture updates one. The `.png` extension rule already kept the tool away from other files.