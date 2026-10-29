---
'@mysten/sui': minor
---

Expand the Core API query options that were previously limited by the JSON-RPC transport:

- `listTransactions` filters accept `affectedAddress` and `affectedObject`.
- `listTransactions` and `listEvents` accept `startCheckpoint` (inclusive) and `endCheckpoint`
  (exclusive).
- `after` and `before` can be combined to read a window, and either bound works with either
  `order`. On GraphQL, a page that reaches a bound may report `hasNextPage: true` followed by empty
  pages.
- Filter predicates are ANDed: `sender` combines with one of `affectedAddress`, `affectedObject`,
  or `function` on transactions, and with `emitModule` or `eventType` on events. An empty filter
  matches everything.
- Package- and module-level `function` filters can be paginated.
- `emitModule` and `eventType` accept a package-only prefix (`0x…`), and a generic `eventType`
  without type arguments matches every instantiation.
