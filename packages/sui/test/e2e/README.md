# Local client tests

Requires Docker. The harness starts a localnet from the pinned `mysten/sui-tools` image
(`SUI_TOOLS_TAG` overrides it).

```sh
pnpm --filter @mysten/sui test:e2e
```

## GraphQL service

`sui start --with-graphql` doesn't serve subscriptions, so the harness runs a separate GraphQL
service from `mysten/sui-indexer-alt-graphql` at the same tag, configured like production. It
answers transaction and event queries from the fullnode's ledger APIs and serves subscriptions.
Setup fails if that service doesn't serve subscriptions.

That image is amd64 only and stalls under emulation, so on ARM Docker hosts the harness uses the
localnet GraphQL service instead and skips the subscription tests. Under `CI`, setup fails there
instead, unless `SUI_GRAPHQL=localnet` is set. To run them there, use a native build:

```sh
(cd ../sui && cargo build --locked --release -p sui-indexer-alt-graphql)
SUI_GRAPHQL_BINARY="$PWD/../sui/target/release/sui-indexer-alt-graphql" \
  pnpm --filter @mysten/sui test:e2e
```

Build it from the commit of the `sui-tools` image.

- `SUI_GRAPHQL_IMAGE` runs a different image (`SUI_GRAPHQL_PLATFORM` overrides its default
  `linux/amd64` platform). A custom `SUI_TOOLS_TAG` on amd64 needs `SUI_GRAPHQL_IMAGE` or
  `SUI_GRAPHQL_BINARY` too, unless a GraphQL image with the same tag is published.
- `SUI_GRAPHQL=localnet` uses the localnet GraphQL service and skips the subscription tests.
