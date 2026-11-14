---
'@mysten/wallet-sdk': minor
---

Add `@mysten/wallet-sdk/json-rpc-compat` for wallets that still serve the deprecated wallet-standard features. It builds fullnode-shaped JSON-RPC responses from gRPC or GraphQL results: `transactionBlockResponseFromExecution` (with `mappableIncludeFor`) for `sui:signAndExecuteTransactionBlock`, and `dryRunFromSimulation` for code that reads `DryRunTransactionBlockResponse`.
