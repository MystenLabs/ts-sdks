---
'@mysten/sui': major
---

Transaction results changed shape and match across transports:

- Transaction data (`include: { transaction: true }`) has a `kind` discriminated union:
  `kind.ProgrammableTransaction`, a variant for each system transaction, and
  `{ $kind: 'Unknown', Unknown: true }` for kinds the SDK does not recognize. The top-level `inputs`
  and `commands` remain for programmable and programmable system transactions.
- `SuiClientTypes.TransactionData` is a read type: `sender` and every `gasData` field are always
  set, inputs, commands and expirations carry `$kind`, shared object inputs can have
  `mutability: 'NonExclusiveWrite'`, and builder-only unresolved inputs and intents are gone.
  Decode transaction bytes into it with the new `parseTransactionDataBcs` from
  `@mysten/sui/client`; `parseTransactionBcs` returns the builder's snapshot type.
- `SuiClientTypes.Transaction` has a `sender` on every client, without `include.transaction`.
  System transactions report `0x0`. `parseGrpcTransactionResponse` needs `transaction.sender` in
  the read mask.
- BCS schemas decode every current system transaction: `bcs.SharedObjectRef` encodes
  `bcs.SharedObjectMutability`, `bcs.Owner` adds `Party`, and `bcs.MoveObjectType` renames
  `AccumulatorBalanceWrapper` to `SuiBalanceAccumulatorField` and adds `BalanceAccumulatorField`.
- `bcs.TransactionKind` system variants decode to named structs instead of tuples
  (`ChangeEpoch.systemPackages`, cancelled transaction version assignments, stored execution time
  observations), and `*ObjInitialSharedVersion` fields are renamed to `*ObjectInitialSharedVersion`.
  The encoded bytes are unchanged.
- GraphQL reads an event's `packageId` and `module` from the transaction's top-level command,
  reports `0x0` as the sender of system transaction events, and reports the failing `command` for
  every execution error. Unchanged consensus objects without a version report `version: null`.
- `SuiGraphQLClient` `getTransaction` and `listTransactions` return every event and object type of
  a transaction, not just the first 50.
- Execution errors in `effects.status` match across transports. GraphQL's top-level `status`
  error distinguishes only `MoveAbort`; other errors are `Unknown`.
- `MoveLocation.function` is removed; use `functionName`.
- `bcs.TransactionEffects` decodes to named structs instead of tuples: V2 `changedObjects` entries
  are `{ objectId, inputState, outputState, idOperation }`, `unchangedConsensusObjects` entries are
  `{ objectId, kind }`, version/digest pairs are `{ version, digest }`, `ObjectIn.Exist` is
  `{ version, digest, owner }`, `ObjectOut.ObjectWrite` is `{ digest, owner }`, `MoveAbort` is
  `{ location, abortCode }`, accumulator `EventDigest` entries are `{ eventIndex, digest }`, and V1
  object references with owners are `{ reference, owner }`. The
  `InsufficientBalanceForWithdraw` error variant is renamed to `InsufficientFundsForWithdraw` and
  `congested_objects` to `congestedObjects`. The encoded bytes are unchanged.
- `bcs.MultiSig` and `bcs.MultiSigPublicKey` fields are camelCase: `multisig_pk` is `multisigPk`
  and `pk_map` is `pkMap`, including in `MultiSigStruct` and the `multisig` returned by
  `parseSerializedSignature`, which keeps the old names as deprecated aliases.
