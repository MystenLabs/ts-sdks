---
'@mysten/codegen': minor
---

- Fix phantom type parameter index mismatch when generating BCS types for structs with phantom types followed by non-phantom types
- Include phantom type parameters in generated MoveStruct names (e.g., `Pair<T, phantom U>` instead of just `Pair<T>`)
- Add `includePhantomTypeParameters` config option to generate BCS types that include phantom type parameters as function arguments
- Remove invalid `--yes` flag from `sui move summary` CLI calls
