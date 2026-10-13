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
- **GraphQL can briefly omit an event's checkpoint** — `listEvents` reads the checkpoint from
  `transaction.effects.checkpoint`, which the server resolves to `null` when it serves a very recent
  transaction before it is assigned to a checkpoint (observed once in e2e runs, on an unfiltered
  read of the first events on a fresh localnet). The GraphQL transport now looks those checkpoints
  up by transaction digest (`multiGetTransactionEffects`), retrying up to 3 times 250ms apart, and
  only throws (`listEvents response is missing the checkpoint for transaction <digest>`) if the lag
  outlasts that. Pages where every event has a checkpoint cost no extra requests. gRPC `ListEvents`
  only scans checkpointed ledger data, so it always populates the field. A server-side fix
  (resolving the checkpoint from the event index) would remove the follow-up lookup.

## Blocked by GraphQL as well

- **OR of filters, negated predicates, and repeated predicate values** — the gRPC DNF filter model
  (`terms` of ANDed, optionally negated literals). GraphQL currently has no equivalent.
- **`emitModule`/`eventType`/`eventStreamHead`/`packageWrite` as _transaction_ predicates** — not
  present on the GraphQL `TransactionFilter` input.
- **Transaction filters on `listCheckpoints`** — the GraphQL `checkpoints` query only supports
  checkpoint/epoch bounds, not transaction predicates.
- **Transaction digests on `listCheckpoints`** — gRPC returns each checkpoint's full contents, but
  GraphQL exposes them as a nested connection capped at the server page size, which would silently
  truncate busy checkpoints. Use `listTransactions` with a checkpoint range instead.
- **`eventStreamHead` event predicate** — not present on the GraphQL `EventFilter` input.
