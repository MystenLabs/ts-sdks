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

Findings from the 2026-10-14 indexer prototypes against public mainnet and testnet nodes. The stream
code they refer to arrives later in this stack (`src/client/stream/`, `src/grpc/stream/`,
`src/graphql/stream/`).

- **Replay handoff waits for the first live frame** — a following gRPC stream with a `start` opens
  the subscription first and only begins the historical read once the subscription reports a
  position (`src/client/stream/follow.ts`). Time to first frame is 1–3 s unfiltered and up to 17 s
  for sparse filters such as `affectedAddress`, so restarts of a filtered indexer sit idle that
  long. Reading history up to the indexed tip while the subscription connects would remove the wait;
  the later handoff must then dedupe the overlap the same way the recovery scan does.
- **GraphQL subscriptions skip or repeat items at the server's backfill-to-live handoff** — about
  one in four resubscribes with an `after` cursor or `afterCheckpoint` either repeats the cursor's
  item or skips a checkpoint (server side; reproducible with raw SSE). The SDK drops the repeated
  item and repairs skipped checkpoints for `streamCheckpoints`. Transaction and event streams cannot
  tell a skipped checkpoint from an unmatched one when a filter is set, so a long GraphQL follow can
  still lose data across reconnects until the server is fixed; an unfiltered transaction stream
  could use the same checkpoint-gap repair.
- **Public fullnodes end every gRPC stream after about 30 s** — both gRPC-web and native HTTP/2
  (`RST_STREAM INTERNAL_ERROR`). Streams reconnect and recover without gaps, and the first reconnect
  after progress is immediate, but each cut still costs a recovery scan; tip latency p99 is about
  3.8 s against a 0.95 s p50. Worth raising with the node operators.
- **Server errors for pruned history differ by RPC** — `ListCheckpoints` below
  `lowestAvailableCheckpoint` returns `OUT_OF_RANGE`; `ListTransactions` returns
  `INTERNAL "missing checkpoint N while resolving tx boundary"`, which callers cannot distinguish
  from a server fault. GraphQL serves full history, so the same `start` succeeds there.
- **GraphQL returns an empty page for a checkpoint cursor combined with an `afterCheckpoint` naming
  the same checkpoint** — the SDK keeps the bound one checkpoint behind the cursor; the server
  should accept the redundant bound.
- **Stream option and token errors are plain `Error`s** — applications match on message text to tell
  a bad or foreign token from a transient failure. A typed error with a code would help.
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
