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
- `EventEntry.checkpoint` is always set, and `listEvents` throws when the server omits a required
  event field such as the checkpoint, package, module, sender, type, transaction digest or index.
- Add `listCheckpoints` to the Core API and as a top-level method on `SuiGrpcClient` and
  `SuiGraphQLClient`. It pages through checkpoint summaries with the same `limit`, `order`, cursor
  and checkpoint range options as `listTransactions`. Custom `CoreClient` subclasses must implement
  it.
