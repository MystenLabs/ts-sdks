---
'@mysten/codegen': minor
---

Function parameters whose shape can't be built from a plain TS value (non-`key` struct or enum, `vector<KeyStruct>`, etc.) now render as `TransactionArgument` instead of `RawTransactionArgument<string>`, forcing callers to pass a value from a prior Move call or `tx.makeMoveVec(...)`. `MoveModuleBuilder.includeType`/`includeTypes` no longer take a `moduleBuilders` record — construct a shared `ModuleRegistry` and pass it to each builder instead.
