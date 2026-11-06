---
'@mysten/sui': major
---

Transaction results changed shape and match across transports:

- Transaction data (`include: { transaction: true }`) has a `kind` discriminated union:
  `kind.ProgrammableTransaction`, a variant for each system transaction, and
  `{ $kind: 'Unknown', Unknown: true }` for kinds the SDK does not recognize. The top-level `inputs`
  and `commands` remain for programmable and programmable system transactions.
- `SuiClientTypes.TransactionData` is a read type: inputs, commands and expirations carry `$kind`,
  shared object inputs can have `mutability: 'NonExclusiveWrite'`, and builder-only unresolved
  inputs and intents are gone. Decode transaction bytes into it with the new
  `parseTransactionDataBcs` from `@mysten/sui/client`; `parseTransactionBcs` returns the builder's
  snapshot type.
- `SuiClientTypes.Transaction` has a `sender` on every client, without `include.transaction`.
  System transactions report `0x0`. `parseGrpcTransactionResponse` needs `transaction.sender` in
  the read mask.
- BCS schemas decode every current system transaction: `bcs.SharedObjectRef` encodes
  `bcs.SharedObjectMutability`, `bcs.Owner` adds `Party`, and `bcs.MoveObjectType` renames
  `AccumulatorBalanceWrapper` to `SuiBalanceAccumulatorField` and adds `BalanceAccumulatorField`.
- GraphQL reads an event's `packageId` and `module` from the transaction's top-level command,
  reports `0x0` as the sender of system transaction events, and reports the failing `command` for
  every execution error. Unchanged consensus objects without a version report `version: null`.
- `SuiGraphQLClient` `getTransaction` and `listTransactions` return every event and object type of
  a transaction, not just the first 50.
- Execution error names match across transports.
- `MoveLocation.function` is removed; use `functionName`.
