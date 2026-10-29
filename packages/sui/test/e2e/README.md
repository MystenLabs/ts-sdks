# Local client tests

Requires Docker. The harness starts a localnet from the pinned `mysten/sui-tools` image
(`SUI_TOOLS_TAG` overrides it; on ARM hosts the default is the `-arm64` variant, and an override
must name one).

```sh
pnpm --filter @mysten/sui test:e2e
```

GraphQL, including subscriptions, comes from `sui start --with-graphql` in the same container. Setup
fails if that service doesn't serve subscriptions, so a custom `SUI_TOOLS_TAG` must be a release
that does.
