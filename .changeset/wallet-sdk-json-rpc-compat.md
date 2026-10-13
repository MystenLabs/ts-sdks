---
'@mysten/wallet-sdk': minor
---

Add `@mysten/wallet-sdk/json-rpc-compat`, helpers for wallets that still implement the deprecated `sui:signAndExecuteTransactionBlock` wallet-standard feature on top of the gRPC or GraphQL Core API. `transactionBlockResponseFromExecution` builds the legacy `SuiTransactionBlockResponse` from an executed transaction (with `mappableIncludeFor` giving the `include` to execute with), and `dryRunFromSimulation` / `tryDryRunFromSimulation` build the legacy `DryRunTransactionBlockResponse` from a simulated one.
