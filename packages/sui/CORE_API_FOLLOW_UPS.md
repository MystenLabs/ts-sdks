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
- **GraphQL event checkpoints** — `listEvents` reports `checkpoint: null` for an event whose
  checkpoint the server doesn't return. Seen once in e2e runs (an unfiltered read of the first
  events on a fresh localnet); retrying the page returned it.
- **GraphQL `affectedAddress` can include the sender and gas owner** — gRPC, and GraphQL servers
  that answer through their gRPC-backed query path, match only addresses whose objects or balance
  changed. GraphQL's live subscription matcher, and GraphQL servers that answer from the Postgres
  index (`tx_affected_addresses`), also match the sender and gas payer. Results can differ between
  transports and between GraphQL deployments.

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

## Ledger streams

Findings from the 2026-10-14 indexer prototypes against public mainnet and testnet nodes.

- **A quiet gRPC stream doesn't page forward during gap recovery** — on gRPC, a stream that stays
  quiet during gap recovery while the index advances doesn't page forward until its first live item.
  Resuming is unaffected.
- **GraphQL subscriptions carry no progress** — a filtered subscription sends nothing while no item
  matches, so a sparse GraphQL follow reports `Live` only at its first live match, and its resume
  token does not advance until then.
- **Event and progress frames carry no timestamp** — measuring lag needs a second checkpoint stream
  or a lookup; `EventEntry.checkpoint` is the only ordering information.
- **Per-frame CPU** — the full gRPC transaction path costs about 96 µs per transaction (about 10,000
  tx/s per core, versus about 120 tx/s of mainnet production). Two avoidable costs:
  `restore().snapshot()` runs two valibot validations per transaction in
  `src/client/transaction-data.ts` (about 36 µs), and the resume token is built and base64-encoded
  for every frame in `src/client/stream/session.ts` (about 6 µs) even when it is never read.
- **`effects`/`events` includes request both structured fields and BCS** — gRPC read masks in
  `src/grpc/core.ts` ask for `effects` and `effects.bcs` (and `events`, `events.bcs`, JSON), which
  is about 35% more effects bytes and about 1.8x the event bytes on the wire with no CPU benefit.
