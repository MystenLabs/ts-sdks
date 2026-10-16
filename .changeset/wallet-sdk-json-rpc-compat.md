---
'@mysten/wallet-sdk': minor
---

Add `@mysten/wallet-sdk/json-rpc-compat`, which builds legacy JSON-RPC responses from gRPC or GraphQL results for wallets that still implement the deprecated `sui:signAndExecuteTransactionBlock` feature: `transactionBlockResponseFromExecution` (with `mappableIncludeFor`) for executions, and `dryRunFromSimulation` / `tryDryRunFromSimulation` for simulations.
