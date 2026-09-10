# GraphQL schema generation

From the repository root, update the subscription-enabled upstream schema and then regenerate SDK
operation documents:

```bash
pnpm --filter @mysten/sui update-graphql-schema
pnpm --filter @mysten/sui codegen:graphql
```

The update command uses Sui's `staging.graphql`, which includes the checkpoint, transaction, and
event subscriptions implemented by this SDK. It rejects schemas missing these subscriptions before
writing files and generates the corresponding `tada-env.ts` types.

For reproducible generation from a local Sui checkout, provide its SDL explicitly. The path is
relative to `packages/sui`, where pnpm runs the command:

```bash
pnpm --filter @mysten/sui update-graphql-schema --schema ../../../sui/crates/sui-indexer-alt-graphql/staging.graphql
pnpm --filter @mysten/sui codegen:graphql
```

`--schema` also accepts an HTTP(S) URL, including a raw GitHub URL pinned to a commit. Add `--check`
to verify that the checked-in schema and gql.tada files match that source without changing files:

```bash
pnpm --filter @mysten/sui update-graphql-schema --schema src/graphql/generated/schema.graphql --check
```
