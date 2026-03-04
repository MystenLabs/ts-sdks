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
- **Adapters (browser)**: `src/adapters/browser.ts` — InMemorySignerAdapter, WebCryptoSignerAdapter,
  PasskeySignerAdapter, RemoteCliAdapter, BaseSignerAdapter
- **Adapters (node)**: `src/adapters/node.ts` — parseKeystoreFile, keystore utilities
- **UI**: `src/ui/` — Lit Web Components (panel, signing-modal, signing, accounts, balances,
  new-account, account-selector, tab-bar, settings, objects, dropdown, standalone, mount)
- **React**: `src/react/` — useDevWallet hook, DevWalletProvider, React-wrapped Lit components
- **Client**: `src/client/` — DevWalletClient for PostMessage popup wallet
- **Server**: `src/server/` — request handler for standalone web wallet
- **CLI**: `src/bin/cli.ts` — `npx @mysten/dev-wallet serve`
- **Demo**: `examples/demo/` — dapp-kit-react based demo with Tailwind v4

### Export Map

| Import path                        | Environment  | Contents                                        |
| ---------------------------------- | ------------ | ----------------------------------------------- |
| `@mysten/dev-wallet`               | Any          | DevWallet, types, config                        |
| `@mysten/dev-wallet/adapters`      | Browser-safe | InMemory, WebCrypto, Passkey, RemoteCLI, Base   |
| `@mysten/dev-wallet/adapters/node` | Node.js only | parseKeystoreFile, keystore utilities           |
| `@mysten/dev-wallet/ui`            | Browser      | Lit components, mountDevWallet                  |
| `@mysten/dev-wallet/react`         | Browser      | useDevWallet, DevWalletProvider, React wrappers |
| `@mysten/dev-wallet/client`        | Browser      | DevWalletClient                                 |
| `@mysten/dev-wallet/server`        | Node.js      | parseWalletRequest                              |

### Key Patterns

- `./adapters` is browser-safe (no `node:` imports). Node-only adapters are at `./adapters/node`.
- Lit components use `experimentalDecorators` (tsconfig)
- Tests: vitest.config.ts excludes `examples/**` and browser tests

## Review Session Guide

The user drives the review. Claude sets up the environment, explains architecture, asks review
questions, and fixes issues. The user tests in the browser and gives feedback.

**Key principle**: The user clicks around the demo and tests things. Claude does NOT operate the
browser for them. Claude's job is to: set up the environment, give the user a brief summary of what
to test on each tab, ask focused review questions, and fix bugs as they're found.

### 1. Set up the environment

Run these steps silently (don't narrate each command):

```bash
kill $(lsof -ti :5173) 2>/dev/null; kill $(lsof -ti :5174) 2>/dev/null
pnpm turbo build --filter=@mysten/dev-wallet
pnpm --filter @mysten/dev-wallet test:node
cd packages/dev-wallet/examples/demo && rm -rf node_modules/.vite && pnpm dev
```

Report: build status, test count/pass, demo URL.

### 2. Brief the user

Give a concise summary of the package (what it does, how many tests, what's been built). Then tell
the user:

> The demo is running at http://localhost:5173/. It uses dapp-kit-react with a ConnectButton in the
> header. An embedded DevWallet is auto-registered. Here's what to try:
>
> 1. **Connect** — Click Connect in the header. You should see "Dev Wallet" in the wallet list.
>    Connect to it.
> 2. **Transfer** — Try sending SUI to yourself (leave recipient empty). The signing modal should
>    appear centered on screen.
> 3. **Sign Message** — Try signing a text message. Check that the modal shows "Sign Message" with
>    the message preview.
> 4. **Transaction** — Try both sign-only and sign+execute modes. The modal should show analyzed
>    transaction commands (SplitCoins, TransferObjects, etc.).
> 5. **Panel** — Click the purple FAB button (bottom-right) to see the wallet management sidebar
>    with accounts and balances.
> 6. **Standalone Setup** — Expand the section at the bottom to register a second standalone wallet
>    via DevWalletClient.
>
> Try each feature and let me know what you think. I have some specific questions as you go.

### 3. Ask review questions as the user explores

After the user has had a chance to try the demo, ask focused questions. Examples:

- "Does the signing modal feel right as a centered overlay? Is the size appropriate?"
- "The transaction analyzer shows commands like MoveCall, SplitCoins, TransferObjects — is this the
  right level of detail?"
- "Does the wallet sidebar (FAB button) feel natural for account management?"
- "Is the `useDevWallet` hook API ergonomic enough, or should it accept more options?"
- "Should the OKLch dark theme colors match the host app's theme, or stay independent?"

Ask 1-2 questions at a time, not a wall of questions. Wait for answers before asking more.

### 4. Fix issues as they come up

When the user reports a bug or gives feedback:

1. If it's blocking the review, fix it immediately, rebuild, and tell the user to refresh
2. If it's not blocking, log it and move on

### 5. After the review

Summarize all issues found (fixed and open), open questions, and next steps.

### Known pitfalls

- **Port conflicts**: Demo runs on 5173, standalone wallet on 5174. Kill both before starting.
- **Vite HMR**: If the page errors after a code change, restart the dev server (kill port, clear
  `.vite` cache, `pnpm dev`).
- **React Strict Mode**: Dev mode double-invokes effects. Demo `useEffect`s need `cancelled` flag
  pattern to avoid duplicate side effects.
