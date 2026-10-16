---
'@mysten/sui': major
---

`doGasSelection` is now an option of `client.core.simulateTransaction` and every client's
`simulateTransaction`. `GraphQLSimulateTransactionOptions` has been removed; use
`SuiClientTypes.SimulateTransactionOptions` instead.
