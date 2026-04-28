---
'@mysten/codegen': minor
---

Fix codegen for upgraded on-chain package IDs (only `utils/` was emitted) and use each type's
introducing package version for BCS type names. Type origins are read per-(package, module)
from the summary metadata, so structs added in upgrades — for both the root package and any
upgraded deps — render with their correct on-chain address.

Adds an `errorClass` config option to swap the built-in `Error` thrown by `normalizeMoveArguments`.
