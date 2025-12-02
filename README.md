# Mysten Typescript SDKs

A collection of TypeScript SDKs for interacting with the Sui blockchain ecosystem.

## Documentation

For SDK documentation visit https://sdk.mystenlabs.com/typescript

## Development

Any of the following commands can be run at the root of the project or from an individual package directory.

When running commands for individual you can use `turbo` to ensure all of a tasks dependencies are run first (eg. `pnpm turbo build`)

### Setup

```bash
pnpm install
pnpm turbo build
```

### Building

```bash
pnpm build
# or
pnpm turbo build
```

### Unit tests

For unit tests

```bash
pnpm test
# or
pnpm turbo test
```

### e2e tests

The e2e tests require docker to be installed and uses [testcontainers](https://node.testcontainers.org/) to create an e2e test environment

```bash
pnpm test:e2e
```

Using turbo to run e2e tests in parallel is not recommended

### Linting

This repo uses `oxlint` and `prettier` for linting

```bash
pnpm lint
```

You can automatically fix many lint issues by running

```bash
pnpm lint:fix
```

To run oxlint and prettier individually you can use the following commands:

```bash
pnpm prettier:check
pnpm prettier:fix
pnpm oxlint:check
pnpm oxlint:fix
```
