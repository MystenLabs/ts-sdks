# Core query API follow-ups gated on the JSON-RPC sunset

The core query APIs (`listTransactions`, `listEvents`, `listCheckpoints`) are intentionally
restricted to what all three transports (gRPC, GraphQL, JSON-RPC) can support with identical
behavior, verified by the parity tests in `test/e2e/clients/core/queries.test.ts`. Several
capabilities were left out of the core API only because JSON-RPC cannot express them. Once JSON-RPC
is fully deprecated and removed, they can be promoted into the core API.

Until then, advanced filtering is available through the raw gRPC ledger service
(`client.ledgerService.listTransactions` and friends take full DNF filters), and through raw GraphQL
queries where the schema supports it. Promoting a capability means extending the core filter types
in `src/client/types.ts` and the shared resolution helpers in `src/client/query-filters.ts`,
implementing the gRPC/GraphQL mappings, and extending the parity tests.

## Blocked only by JSON-RPC

- **`affectedAddress` transaction predicate** — no JSON-RPC equivalent: `FromOrToAddress` is
  rejected server-side ("CURRENTLY NOT SUPPORTED"), and emulating it with `FromAddress` +
  `ToAddress` queries silently misses sponsored transactions and address-balance deposits, and
  cannot reproduce exact intra-checkpoint ordering.
- **`affectedObject` transaction predicate** — the JSON-RPC `AffectedObject` filter is feature-gated
  server-side and rejected by default (`Feature is not supported`), and the older `ChangedObject`
  filter has narrower semantics (misses deleted/wrapped/read objects).
- **`startCheckpoint`/`endCheckpoint` on `listTransactions` and `listEvents`** — JSON-RPC has no
  checkpoint range support, and its single-checkpoint `Checkpoint` filter cannot be combined with
  other filters.
- **A `listCheckpoints` core method** — a summaries-only version (sequence number, digest, epoch,
  timestamp) was prototyped and dropped from the initial release because listing checkpoints is
  mostly useful for getting the transactions they contain, which is better served by
  `listTransactions` with checkpoint ranges once those are promoted. Including per-checkpoint
  transaction digests has exact parity on gRPC and JSON-RPC, but GraphQL exposes them as a nested
  connection capped at the server page size, which would silently truncate busy checkpoints. If a
  core method is added, checkpoint ranges are implementable exactly on every transport (JSON-RPC's
  sequence-number cursor emulates them).
- **Combining `after` and `before` bounds, and mixing bounds with either order** — JSON-RPC cursors
  are direction-relative, so a query currently accepts at most one bound and the bound must match
  the traversal direction (`after` implies ascending, `before` descending). gRPC treats both as
  order-independent canonical position bounds and GraphQL accepts both Relay bounds together, so
  windowed queries (`after` + `before`) and reversed reads within a bound can be enabled by relaxing
  `resolvePagination` once JSON-RPC is gone.
- **Combining multiple predicates in one filter (AND)** — JSON-RPC accepts exactly one filter per
  query. GraphQL supports one instance of each predicate ANDed together, so this can be promoted to
  that level once JSON-RPC is gone.
- **Package-only prefixes for event predicates** — core `emitModule` requires `package::module` and
  `eventType` requires at least a module because JSON-RPC's `MoveModule`/`MoveEventModule` filters
  require a module name. GraphQL and gRPC both support package-only prefixes.
- **Non-nullable `EventEntry.checkpoint`** — JSON-RPC `queryEvents` responses carry no checkpoint
  information, so the field is `string | null` and `null` on JSON-RPC.

## Blocked by GraphQL as well

- **OR of filters, negated predicates, and repeated predicate values** — the gRPC DNF filter model
  (`terms` of ANDed, optionally negated literals). GraphQL currently has no equivalent.
- **`emitModule`/`eventType`/`eventStreamHead`/`packageWrite` as _transaction_ predicates** — not
  present on the GraphQL `TransactionFilter` input.
- **Transaction filters on `listCheckpoints`** — the GraphQL `checkpoints` query only supports
  checkpoint/epoch bounds, not transaction predicates.
- **`eventStreamHead` event predicate** — not present on the GraphQL `EventFilter` input.

## Other tracked items

- The gRPC parity e2e tests in `test/e2e/clients/core/queries.test.ts` are excluded via the
  `EXCLUDE` constant until `SUI_TOOLS_TAG` points at an image that serves the
  `ListCheckpoints`/`ListTransactions`/`ListEvents` RPCs.
- `MoveEventType` matching semantics for generic types differ between JSON-RPC (exact struct tag
  match) and gRPC/GraphQL (a bare `pkg::mod::Name` matches any instantiation). The parity tests only
  cover non-generic event types; revisit when promoting package-only prefixes.
