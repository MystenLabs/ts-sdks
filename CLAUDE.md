# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

# Run e2e tests (requires Docker)
pnpm test:e2e
```

### Linting and Formatting

```bash
# Check lint and formatting
pnpm lint

# Auto-fix lint and formatting issues
pnpm lint:fix

# Run eslint and prettier separately
pnpm eslint:check
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

### Development Workflow

1. Changes require changesets for version management
2. Turbo ensures dependencies are built before dependents
3. ESLint and Prettier are enforced across the codebase
4. Tests must pass before changes can be merged
