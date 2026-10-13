---
'@mysten/sui': minor
---

Expand the Core API query capabilities that were previously limited by the JSON-RPC transport:

- `listTransactions` filters accept `affectedAddress` and `affectedObject` predicates.
- `listTransactions` and `listEvents` accept `startCheckpoint` (inclusive) and `endCheckpoint`
  (exclusive) to limit results to a range of checkpoints. Invalid ranges are rejected with
  `` `endCheckpoint` must be greater than or equal to `startCheckpoint` `` or
  `Invalid startCheckpoint "<value>": expected a non-negative integer`.
- `after` and `before` can be combined to read a window, and either bound can be used with either
  `order`. A query bounded only by `before` still defaults to descending. The
  "Only one of `after` or `before`" and "can not be combined with … queries" errors are gone.
  GraphQL treats cursors as inclusive bounds, so a windowed read (or a read toward a lone bound) may
  report `hasNextPage: true` and then return one final empty page at the bound.
- Filter predicates are combined with AND: `sender` combines with any one of `affectedAddress`,
  `affectedObject`, or `function` on transactions, and with `emitModule` or `eventType` on events.
  An empty filter matches everything. The "must specify exactly one of" errors are replaced by
  `A transaction filter may specify at most one of affectedAddress, affectedObject, function` and
  `An event filter may specify at most one of emitModule, eventType`.
- Package- and module-level `function` filters can be paginated with `after`/`before`.
- `emitModule` and `eventType` accept a package-only prefix (`0x…`). A bare generic `eventType`
  (`pkg::mod::Name`) matches every instantiation.
- `EventEntry.checkpoint` is now always a `string` instead of `string | null`.
