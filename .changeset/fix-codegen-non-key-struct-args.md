---
'@mysten/codegen': minor
---

Type non-`key` Move struct/enum arguments as `RawTransactionArgument<never>` instead of `RawTransactionArgument<string>`, so only `TransactionArgument` values from prior Move calls are accepted. `MoveModuleBuilder.includeType`/`includeTypes` no longer take a `moduleBuilders` record — construct a shared `ModuleRegistry` and pass it to each builder instead.
