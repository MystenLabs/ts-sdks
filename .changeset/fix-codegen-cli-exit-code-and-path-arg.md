---
'@mysten/codegen': patch
---

Fix `sui-ts-codegen generate <path>` against fresh `sui move new` packages: the CLI now
propagates non-zero exit codes (was always exiting 0 on failure), the path-arg branch parses
`packageName` from `Move.toml` instead of using the raw path string, and the
"Could not identify main package directory" error now includes actionable remediation.
