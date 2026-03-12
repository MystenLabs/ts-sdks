# dev-wallet CLAUDE.md

## Package-Specific Commands

```bash
# Build (must build deps first)
pnpm turbo build --filter=@mysten/dev-wallet

# Tests
pnpm --filter @mysten/dev-wallet test:node     # 280 node tests
pnpm --filter @mysten/dev-wallet test:browser   # 47+12 browser tests via Playwright

# Lint
pnpm --filter @mysten/dev-wallet lint

# Demo app (interactive review)
cd packages/dev-wallet/examples/demo && pnpm dev
```

## Architecture Quick Reference

- **Wallet core**: `src/wallet/dev-wallet.ts` — wallet-standard Wallet, request queue, auto-approval
- **Adapters**: `src/adapters/browser.ts` — InMemorySignerAdapter, WebCryptoSignerAdapter,
  PasskeySignerAdapter, RemoteCliAdapter, BaseSignerAdapter
- **UI**: `src/ui/` — Lit Web Components (panel, signing-modal, signing, accounts, balances,
  new-account, account-selector, tab-bar, settings, objects, dropdown, standalone, mount)
- **React**: `src/react/` — useDevWallet hook, DevWalletProvider, React-wrapped Lit components
- **Client**: `src/client/` — DevWalletClient for PostMessage popup wallet
- **Server**: `src/server/` — request handler for standalone web wallet
- **CLI**: `src/bin/cli.ts` — `npx @mysten/dev-wallet serve`
- **Demo**: `examples/demo/` — dapp-kit-react based demo with Tailwind v4

### Export Map

| Import path                   | Contents                                        |
| ----------------------------- | ----------------------------------------------- |
| `@mysten/dev-wallet`          | DevWallet, types, config                        |
| `@mysten/dev-wallet/adapters` | InMemory, WebCrypto, Passkey, RemoteCLI, Base   |
| `@mysten/dev-wallet/ui`       | Lit components, mountDevWallet                  |
| `@mysten/dev-wallet/react`    | useDevWallet, DevWalletProvider, React wrappers |
| `@mysten/dev-wallet/client`   | DevWalletClient                                 |
| `@mysten/dev-wallet/server`   | parseWalletRequest                              |

### Key Patterns

- Lit components use `experimentalDecorators` (tsconfig)
- Tests: vitest.config.ts excludes `examples/**` and browser tests

### Demo

```bash
cd packages/dev-wallet/examples/demo && pnpm dev
```

Demo runs on port 5173, standalone wallet on 5174. If Vite HMR breaks after a code change, clear the
cache: `rm -rf node_modules/.vite && pnpm dev`.
