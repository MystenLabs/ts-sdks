---
'@mysten/sui': major
---

Add `objectType` to `SuiClientTypes.ChangedObject`, so every entry in `effects.changedObjects` and
`effects.gasObject` carries the object's type and callers no longer need to join against the
`objectTypes` include. Both `SuiGrpcClient` and `SuiGraphQLClient` populate it whenever
`include: { effects: true }` is set. The field is required on the type (`objectType: string | null`),
so code that constructs `ChangedObject` values, such as test mocks, must set it.
`parseTransactionEffectsBcs` sets it to `null` because BCS effects carry no types.
