# AGENTS.md

This file provides guidance to AI agents working with code in this repository.

## Overview

This is a monorepo containing TypeScript SDKs for the Sui blockchain ecosystem. It uses pnpm workspaces, turbo for build orchestration, and includes packages for core Sui functionality, dApp development, wallet integration, and various blockchain services.

## Common Commands

### Setup and Build

```bash
# Initial setup
pnpm install
pnpm turbo build

# Build all packages
pnpm build

# Build a specific package with dependencies
pnpm turbo build --filter=@mysten/sui
```

### Testing

```bash
# Run unit tests
pnpm test

# Run unit tests for a specific package
pnpm --filter @mysten/sui test

# Run a single test file
pnpm --filter @mysten/sui vitest run path/to/test.spec.ts

# Run e2e tests (requires Docker for local network)
# All e2e tests for a package:
pnpm --filter @mysten/sui vitest run --config test/e2e/vitest.config.mts

# A specific e2e test file:
pnpm --filter @mysten/sui vitest run --config test/e2e/vitest.config.mts test/e2e/clients/core/objects.test.ts
```

### Linting and Formatting

```bash
# Check lint and formatting
pnpm lint

# Auto-fix lint and formatting issues
pnpm lint:fix

# Run oxlint and prettier separately
pnpm oxlint:check
pnpm prettier:check
```

### Package Management

```bash
# Add a changeset for version updates
pnpm changeset

# Version packages
pnpm changeset-version
```

## Architecture

### Repository Structure

- **packages/** - All SDK packages organized by functionality
  - **typescript/** - Core Sui SDK with submodules for bcs, client, cryptography, transactions, etc.
  - **dapp-kit/** - React hooks and components for dApp development
  - **wallet-standard/** - Wallet adapter implementation
  - **signers/** - Various signing solutions (AWS KMS, GCP KMS, Ledger, etc.)
  - **suins/** - Sui Name Service integration
  - **deepbook/** - DEX integration packages
  - **zksend/** - zkSend functionality

### Build System

- Uses Turbo for monorepo task orchestration with dependency-aware builds
- Each package can have its own test configuration (typically using Vitest)
- Common build outputs: `dist/` for compiled code, with both ESM and CJS formats

### Key Patterns

1. **Modular exports**: Packages use subpath exports (e.g., `@mysten/sui/client`, `@mysten/sui/bcs`)
2. **Shared utilities**: Common functionality in `packages/utils`
3. **Code generation**: Some packages use GraphQL codegen and version generation scripts
4. **Testing**: Unit tests alongside source files, e2e tests in separate directories
5. **Type safety**: Extensive TypeScript usage with strict type checking

### Sui Client Architecture (`packages/sui`)

The `@mysten/sui` package has a multi-transport client architecture. Understanding its layered design is critical before making changes.

#### Layered Client Design

The client system has three layers:

1. **Public client** (`SuiGrpcClient`, `SuiGraphQLClient`, `SuiJsonRpcClient`) — what users instantiate. Provides transport-specific "Native API" access (e.g., raw gRPC service clients, raw GraphQL queries) plus the unified `client.core` property. Supports extension via `$extend`.

2. **Core implementation** (`GrpcCoreClient`, `GraphQLCoreClient`, `JSONRpcCoreClient`) — each extends the abstract `CoreClient` and maps protocol-specific wire data (protobuf, GraphQL fragments, JSON) into unified `SuiClientTypes`. This is where most business logic lives.

3. **Abstract contract** (`CoreClient` in `src/client/core.ts`) — defines the "Core API" that all transports implement. Also provides transport-agnostic composed methods (e.g., `getObject` delegates to `getObjects`, `getDynamicField` uses `getObjects` + BCS parsing).

Key files:

| Layer             | gRPC                  | GraphQL                 | JSON-RPC                |
| ----------------- | --------------------- | ----------------------- | ----------------------- |
| Public client     | `src/grpc/client.ts`  | `src/graphql/client.ts` | `src/jsonRpc/client.ts` |
| Core impl         | `src/grpc/core.ts`    | `src/graphql/core.ts`   | `src/jsonRpc/core.ts`   |
| Abstract contract | `src/client/core.ts`  | ←                       | ←                       |
| Shared types      | `src/client/types.ts` | ←                       | ←                       |

#### Cross-Client Consistency

All three transports must produce identical results for the same Core API call. This is the most important architectural invariant. When making changes:

- **Always read all three implementations** of the affected method before changing any of them.
- A bug in one transport very often exists (in a different form) in the others.
- Each transport has different protocol-level concerns (gRPC read masks, GraphQL query fields, JSON-RPC response shapes) but they must all produce the same unified output.

#### Unified Type System (`src/client/types.ts`)

All Core API methods return types from the `SuiClientTypes` namespace. Key design patterns:

- **Discriminated unions with `$kind`**: All polymorphic types use a `$kind` string literal to discriminate variants. This is used for `ObjectOwner`, `TransactionResult`, `ExecutionError`, `DatatypeResponse`, and others.
  ```typescript
  // This pattern — not optional fields — is how variants are expressed:
  export type ObjectOwner =
  	| { $kind: 'AddressOwner'; AddressOwner: string }
  	| { $kind: 'ObjectOwner'; ObjectOwner: string }
  	| { $kind: 'Shared'; Shared: { initialSharedVersion: string } }
  	| { $kind: 'Immutable'; Immutable: true };
  ```
- **`Include` generics**: Methods like `getObjects` use an `Include` type parameter to make optional data (content, BCS, owner, etc.) available only when requested. This maps to transport-specific field selection (gRPC read masks, GraphQL fragments, JSON-RPC options).
- **Named types for array items**: When a response contains an array of structured items, extract a named type (e.g., `Coin`, `DynamicFieldEntry`) rather than using inline anonymous objects.

#### Transport-Specific Mapping Details

Each implementation has its own way of retrieving and transforming data:

- **gRPC**: Uses `readMask.paths` arrays to request specific fields from the server. Proto-generated types live in `src/grpc/proto/`. Missing paths in the read mask mean the server won't return those fields.
- **GraphQL**: Queries are defined in `.graphql` files in `src/graphql/queries/`, then codegen produces typed document nodes in `src/graphql/generated/queries.ts`. If you need new fields, edit the `.graphql` file and run `pnpm --filter @mysten/sui codegen:graphql`.
- **JSON-RPC**: Legacy transport with the most complex mapping logic. Response shapes often differ significantly from the unified types, requiring manual BCS serialization, ID derivation, or type wrapping.

#### E2E Testing for Parity

The e2e tests in `test/e2e/clients/core/` enforce the cross-client consistency invariant:

- **`testWithAllClients(name, fn)`**: Runs a single test case against all three transports automatically.
- **`expectAllClientsReturnSameData(queryFn, normalizeFn?)`**: Executes the same query on all three clients and asserts deep equality (with optional normalization for transport-specific differences like cursor encoding).

When changing Core API behavior, use both of these to verify parity. Move test contracts live in `test/e2e/data/shared/test_data/sources/`.

### Changeset Conventions

- **`patch`**: Bug fixes that don't change the public API shape
- **`minor`**: New fields, methods, or types added to the public API (even if optional/additive)
- **`major`**: Breaking changes to existing public API

### Development Workflow

1. Changes require changesets for version management
2. Turbo ensures dependencies are built before dependents
3. OXLint and Prettier are enforced across the codebase
4. Tests must pass before changes can be merged

## External Resources

Several packages depend on external repositories and remote schemas. These are used for code generation and type definitions.

### Local Sibling Repositories (relative to ts-sdks)

| Path                 | Description                        | Used By                                                     |
| -------------------- | ---------------------------------- | ----------------------------------------------------------- |
| `../sui`             | Main Sui blockchain implementation | Reference for gRPC, GraphQL, and JSON-RPC implementations   |
| `../sui-apis`        | Protocol buffer definitions        | `@mysten/sui` gRPC codegen (`packages/sui/src/grpc/proto/`) |
| `../suins-contracts` | SuiNS Move contracts               | `@mysten/suins` codegen                                     |
| `../sui-payment-kit` | Payment kit Move contracts         | `@mysten/payment-kit` codegen                               |
| `../walrus`          | Walrus storage contracts           | `@mysten/walrus` codegen                                    |
| `../deepbookv3`      | DeepBook v3 DEX contracts          | `@mysten/deepbook-v3` codegen                               |
| `../apps/kiosk`      | Kiosk Move contracts (optional)    | `@mysten/kiosk` codegen                                     |

### Remote Resources (fetched from GitHub)

| URL                                                         | Description           | Used By                                |
| ----------------------------------------------------------- | --------------------- | -------------------------------------- |
| `MystenLabs/sui/.../sui-indexer-alt-graphql/schema.graphql` | GraphQL schema        | `@mysten/sui` GraphQL codegen          |
| `MystenLabs/sui/.../sui-open-rpc/spec/openrpc.json`         | JSON-RPC OpenRPC spec | `@mysten/sui` JSON-RPC type generation |
| `MystenLabs/sui/Cargo.toml`                                 | Sui version info      | `@mysten/sui` version generation       |

### On-chain Resources

Some packages fetch contract ABIs directly from Sui networks:

- `@mysten/kiosk`: Sui framework kiosk types (0x2) from testnet
- `@mysten/deepbook-v3`: Pyth oracle package from testnet

### Pull Requests

When creating PRs, follow the template in `.github/PULL_REQUEST_TEMPLATE.md`:

- Include a description of the changes
- Check the "This PR was primarily written by AI" checkbox in the AI Assistance Notice section

### Codegen Commands

```bash
# Generate gRPC types from ../sui-apis proto files
pnpm --filter @mysten/sui codegen:grpc

# Fetch latest GraphQL schema from remote (updates schema.graphql)
pnpm --filter @mysten/sui update-graphql-schema

# Generate GraphQL types from schema (updates queries.ts)
pnpm --filter @mysten/sui codegen:graphql

# Generate Move contract bindings (various packages)
pnpm --filter @mysten/payment-kit codegen
pnpm --filter @mysten/walrus codegen
pnpm --filter @mysten/deepbook-v3 codegen
pnpm --filter @mysten/kiosk codegen
```
