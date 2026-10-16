# Local client tests

The harness starts a fullnode, indexer, consistent store, faucet, and GraphQL service from the
pinned `mysten/sui-tools` image. Docker is required.

```sh
pnpm --filter @mysten/sui test:e2e
```

`SUI_TOOLS_TAG` overrides the pinned image.

The GraphQL service started by `sui start --with-graphql` answers queries but does not serve
subscriptions, so the GraphQL subscription tests are skipped (the harness logs a warning) while
GraphQL ledger streams are tested with polling. To run the subscription tests, start a separate
GraphQL service with subscriptions enabled, either from an image:

```sh
SUI_GRAPHQL_IMAGE=mysten/sui-indexer-alt-graphql-preview:102843cdc9b87afebefbf90541f8a4aacb990a04 \
  pnpm --filter @mysten/sui test:e2e
```

or from a native build of the sibling Sui checkout, which avoids amd64 emulation on ARM machines:

```sh
cd ../sui
cargo build --locked --release -p sui-indexer-alt-graphql --features staging
cd ../ts-sdks
SUI_GRAPHQL_BINARY="$PWD/../sui/target/release/sui-indexer-alt-graphql" \
  pnpm --filter @mysten/sui test:e2e
```

The published preview image is amd64; `SUI_GRAPHQL_PLATFORM` overrides the platform it runs on. Both
use the same Docker fullnode and database, and the harness starts and stops them automatically. The
GraphQL build must support the schema and startup flags used by the harness. The ledger stream tests
(`clients/streams.test.ts`) were last run against a native `sui-indexer-alt-graphql` v1.83.0 build;
the preview image predates the subscription fixes they rely on.

`clients/streams.test.ts` pins known gaps in subscription responses with `it.fails` (see
`SUBSCRIPTION_GAPS`). When a server fix lands, those tests start failing: turn them into `it`.
