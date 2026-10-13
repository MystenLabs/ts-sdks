# Core API follow-ups gated on the JSON-RPC sunset

> The JSON-RPC transport was removed in `@mysten/sui` 3.0, so the gated items below can now be
> promoted.

The core APIs, notably the query APIs (`listTransactions`, `listEvents`), are intentionally
restricted to what all three transports (gRPC, GraphQL, JSON-RPC) can support with identical
behavior, verified by the parity tests in `test/e2e/clients/core/queries.test.ts`. Several
capabilities were left out of the core API only because JSON-RPC cannot express them. Once JSON-RPC
is fully deprecated and removed, they can be promoted into the core API.

Until then, advanced filtering is available through the raw gRPC ledger service
(`client.ledgerService.listTransactions` and friends take full DNF filters), and through raw GraphQL
queries where the schema supports it. Promoting a capability means extending the core filter types
in `src/client/types.ts` and the shared resolution helpers in `src/client/query-filters.ts`,
implementing the gRPC/GraphQL mappings, and extending the parity tests.

## Known transport gaps (not gated on the sunset)

- **GraphQL truncates transaction events at 50** — the shared `TRANSACTION_FIELDS` fragment requests
  `events(first: 50)` and no transaction method pages past the first page, so
  `include: { events: true }` on GraphQL returns at most 50 events per transaction while gRPC and
  JSON-RPC return the full list (documented on `TransactionInclude.events`). Fixing this means
  following `pageInfo.hasNextPage` with per-transaction follow-up queries in `parseTransaction`,
  which applies to every transaction method on the GraphQL transport, not just the query APIs.
- **GraphQL omits the aborting function's index** — `MoveAbort.location.function` is set by gRPC
  (from the effects status) but left undefined by GraphQL, whose `ExecutionError` only exposes the
  function's name. The query parity tests strip it when comparing aborted transactions.

## Blocked only by JSON-RPC

- **A `listCheckpoints` core method** — a summaries-only version (sequence number, digest, epoch,
  timestamp) was prototyped and dropped from the initial release because listing checkpoints is
  mostly useful for getting the transactions they contain, which is better served by
  `listTransactions` with checkpoint ranges once those are promoted. Including per-checkpoint
  transaction digests has exact parity on gRPC and JSON-RPC, but GraphQL exposes them as a nested
  connection capped at the server page size, which would silently truncate busy checkpoints. If a
  core method is added, checkpoint ranges are implementable exactly on every transport (JSON-RPC's
  sequence-number cursor emulates them).
- **`doGasSelection` on `simulateTransaction`** — the JSON-RPC dry run has no gas-selection option
  and always substitutes a mocked gas coin when the gas payment is empty, so it can neither select
  coins server-side nor pay from an address balance. The option lives on
  `GrpcSimulateTransactionOptions` and `GraphQLSimulateTransactionOptions` only, and the default
  (`true` when the gas payment is `[]`) is applied by those two transports. Promoting it means
  adding `doGasSelection` to `SuiClientTypes.SimulateTransactionOptions`, implementing it in the
  remaining transports, dropping the "gRPC and GraphQL only" qualifier and the JSON-RPC note from
  the `simulateTransaction` section of `packages/docs/content/sui/clients/executing.mdx`, and
  removing the JSON-RPC branch from the address-balance `gasPaymentMocked` parity test in
  `test/e2e/clients/core/transactions.test.ts`.

## Blocked by GraphQL as well

- **OR of filters, negated predicates, and repeated predicate values** — the gRPC DNF filter model
  (`terms` of ANDed, optionally negated literals). GraphQL currently has no equivalent.
- **`emitModule`/`eventType`/`eventStreamHead`/`packageWrite` as _transaction_ predicates** — not
  present on the GraphQL `TransactionFilter` input.
- **Transaction filters on `listCheckpoints`** — the GraphQL `checkpoints` query only supports
  checkpoint/epoch bounds, not transaction predicates.
- **`eventStreamHead` event predicate** — not present on the GraphQL `EventFilter` input.
