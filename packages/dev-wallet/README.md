# @mysten/dev-wallet

A development-only wallet for building and testing Sui dApps.

> [!WARNING] This wallet is for development and testing only. Do not use it to store real funds. A
> console warning is emitted automatically in production builds.

> [!CAUTION] **Pre-1.0:** This package is under active development. Minor versions may contain
> breaking changes until the API stabilizes at 1.0.

## Why use a dev wallet?

- **Localnet and custom networks** — production wallets don't connect to localnet. This wallet
  connects to any network URL you give it.
- **Separate from mainnet credentials** — your dev keys never touch your real wallet. Ephemeral keys
  disappear on page refresh; persistent keys stay scoped to the browser.
- **E2E testing without manual approval** — set `autoApprove: true` and the wallet signs
  automatically. No click-through, no popups, works in headless CI.
- **Preserve assets across page loads** — use the WebCrypto adapter and your faucet coins survive
  browser refresh.
- **No browser extension required** — embed the wallet directly in your app. Perfect for demos,
  tutorials, and hackathons where asking users to install a wallet extension is friction.
- **Same account you publish contracts from** — connect to the `sui` CLI and sign transactions with
  the same address that ran `sui move publish`, so you can access AdminCap and other owned objects.
- **Works across multiple apps** — run the wallet as a standalone web app and connect any number of
  dApps to it via popup.

## Installation

```bash
npm install @mysten/dev-wallet
```

## Quick start

A single `devWalletInitializer` call covers most use cases. Tweak the options for your scenario:

```typescript
import { createDAppKit } from '@mysten/dapp-kit-react';
import { devWalletInitializer } from '@mysten/dev-wallet';
import { WebCryptoSignerAdapter } from '@mysten/dev-wallet/adapters';

const dAppKit = createDAppKit({
	networks: ['devnet', 'testnet', 'localnet'],
	walletInitializers: [
		devWalletInitializer({
			// Keys persist in IndexedDB — faucet once, keep your coins across reloads
			adapters: [new WebCryptoSignerAdapter()],
			// Skip the wallet picker — connect immediately on load
			autoConnect: true,
			// Show the floating wallet panel (accounts, balances, objects)
			mountUI: true,
			// Auto-create an account on first visit (default: true)
			createInitialAccount: true,
			// Sign without approval modals — great for E2E tests and CI
			// autoApprove: true,
		}),
	],
});
```

## Pick your setup

### dApp Kit plugin (easiest)

If your app uses `@mysten/dapp-kit-react`, embed the wallet directly. It inherits your dApp Kit
network config automatically.

```typescript
import { createDAppKit } from '@mysten/dapp-kit-react';
import { devWalletInitializer } from '@mysten/dev-wallet';
import { WebCryptoSignerAdapter } from '@mysten/dev-wallet/adapters';

const dAppKit = createDAppKit({
	networks: ['devnet', 'testnet', 'localnet'],
	walletInitializers: [
		devWalletInitializer({
			adapters: [new WebCryptoSignerAdapter()],
			autoConnect: true,
			mountUI: true,
		}),
	],
});
```

The wallet appears in the dApp Kit wallet picker. An initial account is created automatically.

### Standalone wallet

Run a self-contained wallet as a separate web app — signing works via popup, same as a production
browser wallet.

```bash
npx @mysten/dev-wallet serve
```

Register it through `walletInitializers` using `devWalletClientInitializer`:

```typescript
import { createDAppKit } from '@mysten/dapp-kit-react';
import { devWalletClientInitializer } from '@mysten/dev-wallet/client';

const dAppKit = createDAppKit({
	networks: ['devnet'],
	walletInitializers: [devWalletClientInitializer({ origin: 'http://localhost:5174' })],
});
```

Or register directly without dApp Kit:

```typescript
import { DevWalletClient } from '@mysten/dev-wallet/client';

DevWalletClient.register({ origin: 'http://localhost:5174' });
```

The default port is 5174. Use `--port` to set a different port.

The standalone wallet includes WebCrypto and InMemory adapters by default. If `sui` is on your PATH,
the CLI adapter is also available — so you can sign with the same address you published contracts
from. Great for teams, multi-app development, and when you can't modify the dApp source.

### Manual setup (no framework)

If you're not using dApp Kit or React, create and register the wallet directly. Localnet, devnet,
and testnet are configured out of the box — no URLs needed.

```typescript
import { DevWallet } from '@mysten/dev-wallet';
import { WebCryptoSignerAdapter } from '@mysten/dev-wallet/adapters';
import { mountDevWallet } from '@mysten/dev-wallet/ui';

const adapter = new WebCryptoSignerAdapter();
await adapter.initialize();
await adapter.createAccount({ label: 'Dev Account' });

const wallet = new DevWallet({ adapters: [adapter] });
wallet.register();
mountDevWallet(wallet);
```

## Which adapter should I use?

| Adapter                  | Keys stored             | Persists across reload | Best for                                        | Caveats                          |
| ------------------------ | ----------------------- | ---------------------- | ----------------------------------------------- | -------------------------------- |
| `InMemorySignerAdapter`  | Memory (Ed25519)        | No                     | Quick prototyping, throwaway tests              | New keys every page load         |
| `WebCryptoSignerAdapter` | IndexedDB (Secp256r1)   | Yes                    | Persistent dev wallet, keeping faucet coins     | Browser-scoped, not exportable   |
| `RemoteCliAdapter`       | `sui` CLI keystore      | Yes (via CLI)          | Using same address you published contracts from | No personal message signing      |
| `PasskeySignerAdapter`   | OS keychain (Secp256r1) | Yes                    | Testing passkey/biometric flows                 | Requires user gesture every sign |

**Start here:** `WebCryptoSignerAdapter` — keys persist across page reloads, faucet once and keep
your coins. Best default for development.

**Fully ephemeral:** `InMemorySignerAdapter` — fresh keys every page load. Useful when you
specifically need a guaranteed clean slate.

**Match your deployed contracts:** `RemoteCliAdapter` — use the same address that ran
`sui move publish`.

You can use multiple adapters at the same time. The wallet aggregates accounts from all of them:

```typescript
devWalletInitializer({
	adapters: [new WebCryptoSignerAdapter(), new InMemorySignerAdapter()],
	mountUI: true,
});
```

## Options reference

Options for `devWalletInitializer` (dApp Kit plugin) and `DevWallet` constructor:

| Option                 | Type                              | Default                   | Description                                                                                   |
| ---------------------- | --------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------- |
| `adapters`             | `BaseSignerAdapter[]`             | _(required)_              | Signer adapters that provide accounts and signing                                             |
| `autoConnect`          | `boolean`                         | `false`                   | Skip wallet picker — connect the first available account on load                              |
| `autoApprove`          | `boolean \| (request) => boolean` | `false`                   | Sign without showing the approval modal. Pass a function for fine-grained control (see below) |
| `mountUI`              | `boolean`                         | `false`                   | Show the floating wallet panel (accounts, balances, objects)                                  |
| `createInitialAccount` | `boolean`                         | `true`                    | Auto-create an account on first visit if the adapter has none                                 |
| `name`                 | `string`                          | `'Dev Wallet'`            | Wallet name shown in the wallet picker                                                        |
| `networks`             | `Record<string, string>`          | devnet, testnet, localnet | Custom network URLs (only needed for non-default networks like staging)                       |

### Fine-grained `autoApprove`

Pass a function to approve only specific request types or chains:

```typescript
devWalletInitializer({
	adapters: [new WebCryptoSignerAdapter()],
	autoApprove: (request) => request.type === 'sign-transaction',
	autoConnect: true,
});
```

Note: `RemoteCliAdapter` and `PasskeySignerAdapter` never auto-sign regardless of this setting.

## Using the CLI adapter

The Remote CLI adapter connects to your local `sui` CLI over HTTP. Private keys never leave the
`sui` binary — only transaction bytes are sent for signing.

The easiest way is the standalone wallet:

```bash
npx @mysten/dev-wallet serve
```

The terminal prints a URL with an auth token (e.g. `http://localhost:5174/?token=abc123`). Open it
in your browser — the token is saved automatically so popups can authenticate with the CLI signer.

To import a CLI account:

1. Click the **+** button on the Accounts tab (or go to Settings to verify the CLI Signer shows
   "Connected")
2. Switch to the **Import** tab in the Add Account dialog
3. Select the address you want from the list (these come from your `sui` keystore)
4. Click **Import**

The imported account now appears alongside your other wallet accounts. When a dApp requests a
signature with that address, the transaction bytes are sent to the local `sui keytool sign` command
— your private key never leaves the CLI.

> **Note:** The CLI signer supports transaction signing only. Personal message signing
> (`sui keytool sign` only accepts TransactionData) will show an error. Use a WebCrypto or InMemory
> account for `signPersonalMessage`.

### Bookmarklet

The standalone wallet also serves a bookmarklet for quick injection into any dApp. You can find it
in the **Settings** tab — drag it to your bookmarks bar, or copy the console snippet from the
terminal output. Clicking the bookmarklet on any page registers the standalone wallet without
needing to modify the dApp's source code.

## Imports

| Import                        | What you get                                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `@mysten/dev-wallet`          | `DevWallet`, `devWalletInitializer`, `DEFAULT_NETWORK_URLS`, config types                                          |
| `@mysten/dev-wallet/adapters` | `InMemorySignerAdapter`, `WebCryptoSignerAdapter`, `PasskeySignerAdapter`, `RemoteCliAdapter`, `BaseSignerAdapter` |
| `@mysten/dev-wallet/ui`       | `mountDevWallet()`, Lit web components                                                                             |
| `@mysten/dev-wallet/react`    | `useDevWallet` hook, `DevWalletProvider`, React-wrapped Lit components                                             |
| `@mysten/dev-wallet/client`   | `DevWalletClient`, `devWalletClientInitializer` for standalone wallet popup mode                                   |
| `@mysten/dev-wallet/server`   | `parseWalletRequest()`, `createCliSigningMiddleware()` for standalone wallet and CLI signing                       |

## Limitations

- **Not for production** — emits a console warning when `NODE_ENV=production`
- **RemoteCLI cannot sign personal messages** — `sui keytool sign` only supports transaction data
- **RemoteCLI and Passkey never auto-sign** — they always require explicit interaction, regardless
  of the `autoApprove` setting
