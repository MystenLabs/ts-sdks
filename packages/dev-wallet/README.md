# @mysten/dev-wallet

A development-only wallet for building and testing Sui dApps.

> **Not for production.** This wallet is for development and testing only. Do not use it to store
> real funds. A console warning is emitted automatically in production builds.

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

## Common recipes

### E2E testing with auto-approval

Set `autoApprove: true` to sign everything without user interaction. Your dApp code stays exactly
the same — same wallet-standard APIs, same signing flow — the approval step is just skipped. Works
great with headless browsers and CI.

```typescript
import { getFaucetHost, requestSuiFromFaucetV2 } from '@mysten/sui/faucet';

devWalletInitializer({
	adapters: [new WebCryptoSignerAdapter()],
	autoApprove: true,
	autoConnect: true,
});

// Fund the account from the faucet (only needed once — WebCrypto persists across runs)
await requestSuiFromFaucetV2({
	host: getFaucetHost('localnet'),
	recipient: wallet.accounts[0].address,
});
```

For fine-grained control, pass a function:

```typescript
devWalletInitializer({
	adapters: [new WebCryptoSignerAdapter()],
	autoApprove: (request) => request.type === 'sign-transaction',
	autoConnect: true,
});
```

Note: `RemoteCliAdapter` and `PasskeySignerAdapter` never auto-sign regardless of this setting.

### Persistent wallet that survives page reloads

Use the WebCrypto adapter. Keys are stored in IndexedDB. Request coins from the faucet once — they
survive page refresh, browser restart, and app redeployment.

```typescript
devWalletInitializer({
	adapters: [new WebCryptoSignerAdapter()],
	autoConnect: true,
	mountUI: true,
});
```

On first load, an account is created automatically. Subsequent loads restore it.

### Using the same address you publish contracts from

The RemoteCLI adapter connects to your local `sui` CLI over HTTP. Private keys never leave the `sui`
binary — only transaction bytes are sent for signing.

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

#### Bookmarklet

The standalone wallet also serves a bookmarklet for quick injection into any dApp. You can find it
in the **Settings** tab — drag it to your bookmarks bar, or copy the console snippet from the
terminal output. Clicking the bookmarklet on any page registers the standalone wallet without
needing to modify the dApp's source code.

### Connecting to localnet or custom networks

Localnet, devnet, and testnet are configured by default. For custom URLs:

```typescript
const wallet = new DevWallet({
	adapters: [new WebCryptoSignerAdapter()],
	networks: {
		localnet: 'http://127.0.0.1:9000',
		staging: 'https://my-staging-fullnode.example.com:443',
	},
});
```

### Demo app with no browser extension required

Embed the wallet with auto-connect and it appears in the dApp Kit wallet picker automatically. Users
don't need to install anything.

```typescript
devWalletInitializer({
	adapters: [new WebCryptoSignerAdapter()],
	autoConnect: true,
	mountUI: true,
	createInitialAccount: true,
});
```

### Wallet shared across multiple apps

Run the standalone wallet once and connect as many dApps as you need:

```bash
npx @mysten/dev-wallet serve --port=5174
```

In each dApp:

```typescript
import { DevWalletClient } from '@mysten/dev-wallet/client';

DevWalletClient.register({ origin: 'http://localhost:5174' });
```

All apps share the same accounts and balances.

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
