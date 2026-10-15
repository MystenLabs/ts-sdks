---
'@mysten/sui': major
'@mysten/dapp-kit-core': patch
'@mysten/wallet-sdk': patch
---

Transaction data returned with `include: { transaction: true }` is decoded from the transaction BCS and has a `kind` discriminated union in place of the top-level `inputs` and `commands`. Read programmable transactions from `kind.ProgrammableTransaction.inputs` and `kind.ProgrammableTransaction.commands`; system transactions such as genesis, epoch changes, and consensus commits decode into their own `kind` variants. Add `parseTransactionDataBcs` to `@mysten/sui/client`.
