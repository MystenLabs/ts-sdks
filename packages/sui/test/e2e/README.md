# Local client tests

The harness starts a fullnode, indexer, consistent store, faucet, and a separate GraphQL preview
service with subscriptions enabled. Docker is required.

```sh
pnpm --filter @mysten/sui test:e2e
```

`SUI_TOOLS_TAG` and `SUI_GRAPHQL_IMAGE` override the pinned images. The published GraphQL preview
image is amd64. On ARM machines where emulation stalls historical reads, build the staging binary
from the sibling Sui checkout and use it directly:

```sh
cd ../sui
cargo build --locked --release -p sui-indexer-alt-graphql --features staging
cd ../ts-sdks
SUI_GRAPHQL_BINARY="$PWD/../sui/target/release/sui-indexer-alt-graphql" \
  pnpm --filter @mysten/sui test:e2e
```

The native service uses the same Docker fullnode and database. The harness starts and stops it
automatically. The sibling checkout must support the schema and startup flags used by the harness.
