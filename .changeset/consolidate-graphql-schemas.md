---
'@mysten/sui': major
---

Consolidate GraphQL schema exports into a single version:

- Removed versioned schema exports: `@mysten/sui/graphql/schemas/2024.1`, `@mysten/sui/graphql/schemas/2024.4`, `@mysten/sui/graphql/schemas/latest`
- Added single unified schema export: `@mysten/sui/graphql/schema`
- The SDK now tracks only the latest mainnet GraphQL schema version

See the migration guide for updating your code to use the new export
