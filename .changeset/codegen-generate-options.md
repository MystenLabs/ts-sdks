---
'@mysten/codegen': minor
---

Add `generate` option to package config for controlling type and function generation. Replaces the old `modules` and `include` package-level properties with a unified `generate: { types, functions, modules }` structure. Add CLI flags `--modules`, `--noTypes`, `--noFunctions`, and `--private` to override generation options from the command line.
