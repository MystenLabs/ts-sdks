---
'@mysten/sui': major
'@mysten/dapp-kit-core': patch
'@mysten/wallet-sdk': patch
---

Transaction data returned with `include: { transaction: true }` has a `kind` discriminated union in place of the top-level `inputs` and `commands`. Read programmable transactions from `kind.ProgrammableTransaction.inputs` and `kind.ProgrammableTransaction.commands`; system transactions such as genesis, epoch changes, and consensus commits map to their own `kind` variants. Kinds, end-of-epoch operations, inputs, or commands the SDK does not recognize map to `{ $kind: 'Unknown', Unknown: true }` instead of failing the request, and an unrecognized expiration maps to `null`. Shared object inputs read from the gRPC and GraphQL clients now keep `mutability: 'NonExclusiveWrite'`. Add `parseTransactionDataBcs` to `@mysten/sui/client` for strict decoding of transaction bytes.
