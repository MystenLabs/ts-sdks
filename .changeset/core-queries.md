---
'@mysten/sui': major
---

Expand the Core API queries:

- `listTransactions` filters accept `affectedAddress` and `affectedObject`. Filter predicates are
  ANDed: `sender` combines with one of `affectedAddress`, `affectedObject` or `function` on
  transactions, and with `emitModule` or `eventType` on events.
- Package- and module-level `function` filters can be paginated. `emitModule` and `eventType` accept
  a package-only prefix, and a generic `eventType` without type arguments matches every
  instantiation.
- `listTransactions` and `listEvents` accept `startCheckpoint` (inclusive) and `endCheckpoint`
  (exclusive), and `after` and `before` can be combined to read a window in either `order`.
- `SuiGraphQLClient` returns the same page cursors as `SuiGrpcClient`: an empty page has `null`
  cursors, and a final page ends at its last item.
- `doGasSelection` is an option of `simulateTransaction` on every client.
  `GraphQLSimulateTransactionOptions` is removed; use `SuiClientTypes.SimulateTransactionOptions`.
