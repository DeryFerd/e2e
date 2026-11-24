---
'e2e': patch
---

`e2e init` no longer writes a scaffold file through a symlink. A `package.json`, `e2e.config.ts`, or test whose path is a link, or that sits under a linked directory such as a `tests/` folder pointing elsewhere, is skipped with `Symlink, not touching: <link> -> <target> (<file>)` instead of being written into the target. The CI file, the agent skill, the instructions files, and the MCP configs already refused a link; the scaffold itself did not, so an `init` run in a project whose `tests/` folder is a junction to a shared directory wrote the new test there. The rest of the run continues, and an interactive run no longer lists a skipped file in its "Changes:" block.
