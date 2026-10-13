# Core API follow-ups

Open work on the core API (`client.core` and the matching top-level methods on `SuiGrpcClient` and
`SuiGraphQLClient`). Both transports must return identical results for the same call, verified by
the parity tests in `test/e2e/clients/core/`, so capabilities only one transport can express stay
out of the core API.

Advanced filtering beyond the core API is available through the raw gRPC ledger service
(`client.ledgerService.listTransactions` and friends take full DNF filters), and through raw GraphQL
queries where the schema supports it. Promoting a capability means extending the core filter types
in `src/client/types.ts` and the shared resolution helpers in `src/client/query-filters.ts`,
implementing the gRPC/GraphQL mappings, and extending the parity tests.

## Known transport gaps

- **GraphQL truncates transaction events at 50** — the shared `TRANSACTION_FIELDS` fragment requests
  `events(first: 50)` and no transaction method pages past the first page, so
  `include: { events: true }` on GraphQL returns at most 50 events per transaction while gRPC
  returns the full list (documented on `TransactionInclude.events`). Fixing this means following
  `pageInfo.hasNextPage` with per-transaction follow-up queries in `parseTransaction`, which applies
  to every transaction method on the GraphQL transport, not just the query APIs.
- **GraphQL omits the aborting function's index** — `MoveAbort.location.function` is set by gRPC
  (from the effects status) but left undefined by GraphQL, whose `ExecutionError` only exposes the
  function's name. The query parity tests strip it when comparing aborted transactions.
- **GraphQL event checkpoints** — GraphQL is expected to always report an event's checkpoint;
  `listEvents` throws `listEvents response is missing expected event fields` if it does not.

## Blocked by GraphQL

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
