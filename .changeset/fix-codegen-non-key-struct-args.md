---
'@mysten/codegen': patch
---

Fix codegen to type non-`key` struct and enum arguments as `RawTransactionArgument<never>` instead of `RawTransactionArgument<string>`. Only structs with the `key` ability can be referenced by object id (`string`); other struct and enum arguments must come from a prior Move call result (a `TransactionArgument`), so `never` is the correct argument-shape type.
