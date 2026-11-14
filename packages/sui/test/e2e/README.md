# Local client tests

Requires Docker. The harness starts a localnet from the pinned `mysten/sui-tools` image
(`SUI_TOOLS_TAG` overrides it; on ARM hosts the default is the `-arm64` variant, and an override
must name one). GraphQL comes from `sui start --with-graphql` in the same container.

```sh
pnpm --filter @mysten/sui test:e2e
```
