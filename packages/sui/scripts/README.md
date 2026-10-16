# GraphQL schema generation

From the repository root:

```bash
pnpm --filter @mysten/sui update-graphql-schema
pnpm --filter @mysten/sui codegen:graphql
```

The update command fetches Sui's `staging.graphql` from `main`, because it has the subscriptions the
SDK uses, and fails if they are missing. To use a local Sui checkout instead, pass `--schema` with a
path relative to `packages/sui`:

```bash
pnpm --filter @mysten/sui update-graphql-schema --schema ../../../sui/crates/sui-indexer-alt-graphql/staging.graphql
pnpm --filter @mysten/sui codegen:graphql
```

`--schema` also accepts an HTTP(S) URL. Add `--check` to verify the checked-in files match a source
without writing them:

```bash
pnpm --filter @mysten/sui update-graphql-schema --schema src/graphql/generated/schema.graphql --check
```
