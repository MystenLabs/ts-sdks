---
'@mysten/sui': major
---

`doGasSelection` is now part of `SuiClientTypes.SimulateTransactionOptions`, so it can be passed to
`client.core.simulateTransaction` and to every client's `simulateTransaction`. The default is
unchanged: gas selection is enabled only when the transaction's gas payment is set to `[]`. The
GraphQL-specific `GraphQLSimulateTransactionOptions` type, which only existed to carry this option,
has been removed; use `SuiClientTypes.SimulateTransactionOptions` instead.
