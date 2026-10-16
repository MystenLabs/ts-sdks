---
'@mysten/sui': major
'@mysten/dapp-kit-core': patch
'@mysten/wallet-sdk': patch
---

Transaction data returned with `include: { transaction: true }` has a new `kind` discriminated union: `kind.ProgrammableTransaction` for programmable transactions, and its own variant for each system transaction such as genesis, epoch changes, and consensus commits. The top-level `inputs` and `commands` remain, and are empty for every kind other than `ProgrammableTransaction`. If the SDK does not recognize a transaction's kind, or cannot map one of its inputs or commands, the whole `kind` is `{ $kind: 'Unknown', Unknown: true }` instead of the request failing. Unrecognized end-of-epoch operations become `Unknown` entries, and an unrecognized expiration maps to `null`.

`SuiClientTypes.TransactionData` is now a read type: inputs, commands, and expirations carry `$kind`, shared object inputs can have `mutability: 'NonExclusiveWrite'`, and builder-only unresolved inputs and intents are gone. Decode transaction bytes into it with the new `parseTransactionDataBcs` from `@mysten/sui/client`; `parseTransactionBcs` returns the builder's snapshot type.
