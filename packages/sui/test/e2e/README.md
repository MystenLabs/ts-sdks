# Local client tests

Requires Docker. The harness starts a localnet from the pinned `mysten/sui-tools` image
(`SUI_TOOLS_TAG` overrides it).

```sh
pnpm --filter @mysten/sui test:e2e
```

## GraphQL subscription tests

The localnet GraphQL service doesn't serve subscriptions, so these tests are skipped and GraphQL
streams are tested with polling only. To run them, point the harness at a GraphQL service with
subscriptions, either a native build (faster on ARM):

```sh
(cd ../sui && cargo build --locked --release -p sui-indexer-alt-graphql --features staging)
SUI_GRAPHQL_BINARY="$PWD/../sui/target/release/sui-indexer-alt-graphql" \
  pnpm --filter @mysten/sui test:e2e
```

or an image (`SUI_GRAPHQL_PLATFORM` overrides its default `linux/amd64` platform):

```sh
SUI_GRAPHQL_IMAGE=mysten/sui-indexer-alt-graphql-preview:102843cdc9b87afebefbf90541f8a4aacb990a04 \
  pnpm --filter @mysten/sui test:e2e
```

`clients/streams.test.ts` was last run against `sui-indexer-alt-graphql` v1.83.0; the preview image
predates fixes it relies on. When a server fixes a field listed in `SUBSCRIPTION_GAPS`, empty that
entry.
