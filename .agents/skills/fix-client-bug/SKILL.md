---
name: fix-client-bug
description: Fix bugs or add features in the @mysten/sui client layer (gRPC, JSON-RPC, GraphQL). Ensures all three transport implementations stay in sync.
user-invocable: true
allowed-tools: Bash, Read, Edit, Write, Grep, Glob
---

# Fix Client Bug / Add Client Feature

Use this workflow when making changes to Core API methods in `packages/sui/src/`. The key architectural constraint is that the three transport implementations (gRPC, JSON-RPC, GraphQL) must always produce identical results for the same Core API call.

## Phase 1: Read Before Writing

1. Identify the affected Core API method(s) in `packages/sui/src/client/core.ts`.
2. Read the shared return types in `packages/sui/src/client/types.ts`.
3. Read **all three** transport implementations of the method:
   - `packages/sui/src/grpc/core.ts`
   - `packages/sui/src/jsonRpc/core.ts`
   - `packages/sui/src/graphql/core.ts`
4. If the method is implemented in the abstract `CoreClient` (not abstract), check whether the bug is in the shared logic or in a method it delegates to.

Do not stop after reading one implementation. A bug in one transport very often exists in a different form in the others.

## Phase 2: Update Types

If the change affects the return type in `src/client/types.ts`:

- Follow the existing `$kind` discriminated union pattern for any polymorphic data. Search types.ts for `$kind` to see how `ObjectOwner`, `TransactionResult`, `ExecutionError`, etc. are structured.
- Extract named types for array items rather than using inline anonymous objects.
- Use explicit return type annotations in the mapping functions (e.g., `(item): SuiClientTypes.SomeType => { ... }`) to catch type mismatches at the implementation site.

## Phase 3: Update All Three Implementations

### gRPC (`src/grpc/core.ts`)
- Check the `readMask.paths` array — fields not listed here are not returned by the server.
- Reference proto types in `src/grpc/proto/` to discover available fields.

### GraphQL (`src/graphql/core.ts`)
- If new data is needed from the API, edit the `.graphql` query file in `src/graphql/queries/`.
- Regenerate types: `pnpm --filter @mysten/sui codegen:graphql`
- This updates `src/graphql/generated/queries.ts` with new typed document nodes.

### JSON-RPC (`src/jsonRpc/core.ts`)
- JSON-RPC response shapes often differ from unified types. Check what the RPC actually returns.
- Some data must be derived rather than mapped directly. Utilities in `src/utils/` (e.g., `deriveDynamicFieldID`, `normalizeStructTag`) may be needed.

## Phase 4: Add E2E Tests

1. Add or update tests in `packages/sui/test/e2e/clients/core/`.
2. Use `testWithAllClients` to run the test across all transports.
3. Use `expectAllClientsReturnSameData` to assert identical results across clients.
4. If you need new on-chain state, add Move functions to `test/e2e/data/shared/test_data/sources/`.
5. If you add lines to Move source files, check whether existing snapshot tests reference line numbers from those files (search for the filename in test files).

## Phase 5: Verify and Changeset

1. Build: `pnpm turbo build --filter=@mysten/sui`
2. Lint: `pnpm --filter @mysten/sui oxlint:check`
3. Unit tests: `pnpm --filter @mysten/sui test`
4. Format: `pnpm prettier:check`
5. Create a changeset — use `minor` if you're adding new fields or types to the public API, `patch` for internal-only fixes.
