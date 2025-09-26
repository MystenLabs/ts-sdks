# Wallet SDK Demo App

This demo app showcases two key components side by side:

1. **Demo Wallet**: A simple wallet implementation based on the wallet-standard that shows what
   transactions are being signed and allows approve/reject actions
2. **Demo dApp**: A counter example app that uses dapp-kit-react to interact with the wallet

## Features

### Demo Wallet

- Creates an in-browser wallet using Ed25519 keypair
- Registers with the wallet-standard
- Shows signing requests with details
- Allows users to approve or reject transactions
- Displays the wallet address

### Demo dApp

- Simple counter application
- Uses dapp-kit-react hooks
- Creates, increments, and resets a counter
- Demonstrates wallet connectivity

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## Configuration

To use the counter functionality, update the `COUNTER_PACKAGE_ID` constant in `src/DemoApp.tsx` with
your deployed counter package ID.

## Architecture

The demo uses:

- Vite for bundling
- React for UI
- @mysten/dapp-kit for dApp functionality
- @mysten/wallet-standard for wallet implementation
- @radix-ui/themes for styling
- @tanstack/react-query for data fetching

The wallet implementation shows a placeholder for future wallet-sdk integration, with a UI that
displays what users are signing before approving transactions.
