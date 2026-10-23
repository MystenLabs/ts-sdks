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

Some cases in `clients/streams.test.ts` need servers with the stream fixes: a fullnode whose
subscriptions fill every field of live items, and a GraphQL service that resumes subscriptions and
pages without gaps. The harness probes each server separately and skips only the cases for the one
that lacks them; it fails setup if a probe cannot get an answer.

- Fullnode: a `sui-tools` image built from `MystenLabs/sui` `main` at or after `d3d2c006`. Build it
  with `docker/sui-tools/build.sh` in that checkout, and point `SUI_TOOLS_TAG` at the tag.
- GraphQL service: `sui-indexer-alt-graphql` built from the
  `hayes/graphql-subscription-progress-edges` branch of `MystenLabs/sui` (head `f0f3e63d`), run with
  `SUI_GRAPHQL_BINARY` as above, or an image of it with `SUI_GRAPHQL_IMAGE`.
