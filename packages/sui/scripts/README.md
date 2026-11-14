# GraphQL schema generation

From the repository root:

```bash
pnpm --filter @mysten/sui update-graphql-schema
pnpm --filter @mysten/sui codegen:graphql
```

The update command fetches Sui's `schema.graphql` from `main` and fails if it lacks the
subscriptions the SDK uses. To use a local Sui checkout instead, pass `--schema` with a path
relative to `packages/sui`; it also accepts an HTTP(S) URL:

```bash
pnpm --filter @mysten/sui update-graphql-schema --schema ../../../sui/crates/sui-indexer-alt-graphql/schema.graphql
pnpm --filter @mysten/sui codegen:graphql
```
