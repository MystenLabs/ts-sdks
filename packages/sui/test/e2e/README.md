# Local client tests

Requires Docker. The harness starts a localnet from the pinned `mysten/sui-tools` image
(`SUI_TOOLS_TAG` overrides it).

```sh
pnpm --filter @mysten/sui test:e2e
```

## GraphQL subscription tests

`sui start --with-graphql` doesn't serve subscriptions, so the harness runs a separate GraphQL
service from `mysten/sui-indexer-alt-graphql` at the same tag. That image is amd64 only and stalls
under emulation, so on ARM machines the harness uses the localnet GraphQL service instead and skips
the subscription tests. To run them there, use a native build:

```sh
(cd ../sui && cargo build --locked --release -p sui-indexer-alt-graphql)
SUI_GRAPHQL_BINARY="$PWD/../sui/target/release/sui-indexer-alt-graphql" \
  pnpm --filter @mysten/sui test:e2e
```

Build it from the commit of the `sui-tools` image. `SUI_GRAPHQL_IMAGE` runs a different image
instead (`SUI_GRAPHQL_PLATFORM` overrides its default `linux/amd64` platform).
