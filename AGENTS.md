# AGENTS.md

## Build/Test/Lint Commands
- `pnpm build` - Build all packages with Turbo
- `pnpm test` - Run unit tests for all packages
- `pnpm --filter @mysten/sui vitest run path/to/test.spec.ts` - Run single test file
- `pnpm lint` - Check ESLint + Prettier
- `pnpm lint:fix` - Auto-fix linting issues
- `pnpm changeset` - Add changeset for version updates

## Architecture
- **Monorepo**: TypeScript SDKs for Sui blockchain, uses pnpm workspaces + Turbo
- **Core packages**: typescript/ (main SDK), dapp-kit/ (React hooks), wallet-standard/, signers/ (AWS/GCP KMS, Ledger)
- **Services**: deepbook/ (DEX), suins/ (name service), zksend/, walrus/
- **Build**: ESM/CJS outputs to `dist/`, dependency-aware builds via Turbo
- **Tests**: Vitest for unit tests, separate e2e configs, Docker for integration tests

## Code Style
- **Headers**: Apache-2.0 license headers required (`header/header` rule)
- **Imports**: Consistent type imports (`@typescript-eslint/consistent-type-imports`), require extensions
- **TypeScript**: Strict typing, no `any` in production, prefer `type` imports
- **Naming**: Underscore prefix for unused vars (`argsIgnorePattern: '^_'`)
- **Modules**: Subpath exports pattern (`@mysten/sui/client`, `@mysten/sui/bcs`)
- **No Buffer**: Banned in packages for web compatibility
