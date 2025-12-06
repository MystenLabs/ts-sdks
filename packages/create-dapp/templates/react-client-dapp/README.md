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
- [pnpm](https://pnpm.io/) for package management

## Project Structure

```
src/
├── components/ui/     # Reusable UI components (Card)
├── lib/utils.ts       # Utility functions (cn for classnames)
├── App.tsx            # Main application component
├── WalletStatus.tsx   # Wallet connection status display
├── OwnedObjects.tsx   # Display objects owned by connected wallet
├── dApp-kit.ts        # dApp Kit configuration
└── index.css          # Tailwind CSS with theme variables
```

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
