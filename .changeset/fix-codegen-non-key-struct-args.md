---
'@mysten/codegen': minor
---

Type non-`key` Move struct/enum arguments (and vectors whose elements aren't purely BCS-serializable, such as `vector<KeyStruct>`) as `RawTransactionArgument<never>` instead of `RawTransactionArgument<string>`, so only `TransactionArgument` values from prior Move calls or `tx.makeMoveVec(...)` are accepted. `MoveModuleBuilder.includeType`/`includeTypes` no longer take a `moduleBuilders` record — construct a shared `ModuleRegistry` and pass it to each builder instead.
