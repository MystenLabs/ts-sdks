# Sui dApp Starter Template

This dApp was created using `@mysten/create-dapp` that sets up a basic React
Client dApp using the following tools:

- [React](https://react.dev/) as the UI framework
- [TypeScript](https://www.typescriptlang.org/) for type checking
- [Vite](https://vitejs.dev/) for build tooling
- [Tailwind CSS v4](https://tailwindcss.com/) for styling
- [Lucide React](https://lucide.dev/) for icons
- [`@mysten/dapp-kit-react`](https://sdk.mystenlabs.com/dapp-kit) for connecting
  to wallets and loading data
- [`@mysten/codegen`](https://sdk.mystenlabs.com/codegen) for generating
  TypeScript bindings from Move code
- [pnpm](https://pnpm.io/) for package management

For a full guide on how to build this dApp from scratch, visit this
[guide](http://docs.sui.io/guides/developer/app-examples/e2e-counter#frontend).

## Project Structure

```
src/
├── components/ui/     # Reusable UI components (Button, Card)
├── contracts/         # Generated TypeScript bindings (via codegen)
├── lib/utils.ts       # Utility functions (cn for classnames)
├── App.tsx            # Main application component
├── Counter.tsx        # Counter display and controls
├── CreateCounter.tsx  # Counter creation component
├── dApp-kit.ts        # dApp Kit configuration
├── constants.ts       # Package IDs per network
└── index.css          # Tailwind CSS with theme variables
```

## Deploying your Move code

### Install Sui cli

Before deploying your move code, ensure that you have installed the Sui CLI. You
can follow the [Sui installation instruction](https://docs.sui.io/build/install)
to get everything set up.

This template uses `testnet` by default, so we'll need to set up a testnet
environment in the CLI:

```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
```

If you haven't set up an address in the sui client yet, you can use the
following command to get a new address:

```bash
sui client new-address secp256k1
```

This well generate a new address and recover phrase for you. You can mark a
newly created address as you active address by running the following command
with your new address:

```bash
sui client switch --address 0xYOUR_ADDRESS...
```

We can ensure we have some Sui in our new wallet by requesting Sui from the
faucet `https://faucet.sui.io`.

### Publishing the move package

The move code for this template is located in the `move` directory. To publish
it, you can enter the `move` directory, and publish it with the Sui CLI:

```bash
cd move
sui client publish --gas-budget 100000000 counter
```

In the output there will be an object with a `"packageId"` property. You'll want
to save that package ID to the `src/constants.ts` file:

```ts
export const TESTNET_COUNTER_PACKAGE_ID = "<YOUR_PACKAGE_ID>";
```

The package ID is mapped to the local package name `@local-pkg/counter` in
`src/dApp-kit.ts` via MVR overrides. This allows the generated TypeScript
bindings to resolve the package address automatically.

### Generating TypeScript bindings

After publishing your Move code, generate the TypeScript bindings:

```bash
pnpm codegen
```

This generates type-safe functions and BCS types in `src/contracts/` based on
your Move modules.

Now that we have published the move code, updated the package ID, and generated
the TypeScript bindings, we can start the app.

## Starting your dApp

To install dependencies you can run

```bash
pnpm install
```

To start your dApp in development mode run

```bash
pnpm dev
```

## Building

To build your app for deployment you can run

```bash
pnpm build
```

## Customizing the UI

This template uses [Tailwind CSS v4](https://tailwindcss.com/docs) for styling
with [shadcn/ui](https://ui.shadcn.com/)-style components. The UI components in
`src/components/ui/` are based on shadcn/ui patterns and can be customized or
extended.

To add more shadcn/ui components, you can copy them from the
[shadcn/ui components](https://ui.shadcn.com/docs/components) documentation and
adapt them to work with your project.

Theme variables are defined in `src/index.css` using Tailwind's `@theme`
directive.
