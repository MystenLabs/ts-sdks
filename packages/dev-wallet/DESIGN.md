# Dev Wallet Design Doc

## Overview

A modular, framework-agnostic dev wallet system for Sui. The core abstraction is a **SignerAdapter**
interface that decouples key management from the wallet itself. The same wallet library and UI
components are used whether the wallet is embedded in a dApp page, running as a standalone web app
you start with `npx`, or bundled as a browser extension.

## How things get used

There are three concrete ways a developer interacts with this system:

### 1. Embedded in a dApp (simplest)

A developer building a dApp wants a wallet with a real approval UI during development. They import
the library, create one or more adapters, and register the wallet. Their existing dapp-kit code just
works — signing requests are queued and shown in the wallet UI for approval.

```typescript
import { DevWallet } from '@mysten/dev-wallet';
import { InMemorySignerAdapter } from '@mysten/dev-wallet/adapters';
import '@mysten/dev-wallet/ui'; // registers <dev-wallet-panel> etc.

const memoryAdapter = new InMemorySignerAdapter();
await memoryAdapter.initialize();
await memoryAdapter.createAccount({ label: 'Dev Account' });

const wallet = new DevWallet({
	adapters: [memoryAdapter],
	clients: { testnet: new SuiClient({ url: getFullnodeUrl('testnet') }) },
});
wallet.register();
wallet.mountUI(); // appends panel to document.body

// dApp code uses normal dapp-kit hooks — nothing changes
// const { mutate: signAndExecute } = useSignAndExecuteTransaction();
```

### 2. Standalone web wallet (run with npx)

A developer wants a full wallet UI running as a separate app. dApps connect to it via popup, just
like Slush.

```bash
npx @mysten/dev-wallet serve --port=5174
```

This starts a Vite dev server showing the wallet UI. All available adapters are automatically
enabled:

- **In-Memory (Ed25519)** — always available, ephemeral keys
- **WebCrypto (Passkey)** — available in browsers with IndexedDB, persistent keys
- **CLI Signer** — available when the `sui` CLI is on your PATH

The wallet aggregates accounts from all adapters. Users can create accounts of any available type.

On the dApp side, the developer registers a client that talks to this web wallet:

```typescript
import { DevWalletClient } from '@mysten/dev-wallet/client';

const unregister = DevWalletClient.register({
	name: 'Dev Wallet',
	origin: 'http://localhost:5174',
});
// This creates a wallet-standard wallet that opens popups to the web wallet
// for connect/sign/approve — same pattern as Slush
```

### 3. Browser extension (future)

Same wallet library + UI components, different shell. Content script injects wallet registration,
background worker holds the adapter, popup shows the same UI components.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  Products                                            │
│  ┌────────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │  Embedded   │ │  Web Wallet│ │ Browser Extension│ │
│  │  (in dApp)  │ │  (npx)     │ │ (future)         │ │
│  └──────┬──────┘ └──────┬─────┘ └────────┬─────────┘ │
├─────────┼───────────────┼────────────────┼───────────┤
│         └───────────────┼────────────────┘           │
│                         ▼                            │
│  ┌──────────────────────────────────────────────┐    │
│  │  UI Components (Lit Web Components)           │    │
│  │  Account manager, signing approval, balances  │    │
│  └──────────────────────┬───────────────────────┘    │
│                         ▼                            │
│  ┌──────────────────────────────────────────────┐    │
│  │  DevWallet (wallet-standard Wallet)           │    │
│  │  Reactive state via nanostores                │    │
│  └──────────────────────┬───────────────────────┘    │
│                         ▼                            │
│  ┌──────────────────────────────────────────────┐    │
│  │  SignerAdapter interface                      │    │
│  │  ┌──────────┐ ┌──────────┐ ┌───────────────┐ │    │
│  │  │ InMemory │ │WebCrypto │ │  SuiCli       │ │    │
│  │  └──────────┘ └──────────┘ └───────────────┘ │    │
│  └──────────────────────────────────────────────┘    │
├──────────────────────────────────────────────────────┤
│  Existing: @mysten/sui, @mysten/signers,             │
│  @mysten/wallet-standard, @mysten/window-wallet-core │
└──────────────────────────────────────────────────────┘
```

The `DevWalletClient` (dApp-side client for the web wallet) is a separate concern — it's a
wallet-standard wallet that communicates with a remote DevWallet via PostMessage, following the
Slush wallet pattern.

---

## Package Structure

Single package at `packages/dev-wallet/` with subpath exports:

```
packages/dev-wallet/
  package.json
  tsdown.config.ts
  src/
    index.ts                    # DevWallet class, types, registration
    types.ts                    # Shared type definitions

    adapters/
      index.ts                  # SignerAdapter interface + adapter exports
      in-memory-adapter.ts      # Ed25519 keypairs in memory
      webcrypto-adapter.ts      # @mysten/signers WebCryptoSigner + IndexedDB
      sui-cli-adapter.ts        # Shells out to Sui CLI (Node.js only)
      keystore-adapter.ts       # Reads ~/.sui/sui_config/sui.keystore (future)

    wallet/
      dev-wallet.ts             # DevWallet implements wallet-standard Wallet
      wallet-state.ts           # Nanostores reactive state

    client/
      index.ts                  # DevWalletClient - dApp-side wallet for connecting to web wallet
      dev-wallet-client.ts      # Implements Wallet via PostMessage to remote web wallet

    ui/
      index.ts                  # Lit web component exports
      dev-wallet-drawer.ts      # Main slide-in panel
      signing-modal.ts          # Transaction/message approval
      account-manager.ts        # List/switch/add/remove accounts
      balance-display.ts        # Coin balances
      account-dialog.ts         # Create/import account

    react/
      index.ts                  # React hooks + wrapped components
      useDevWallet.ts           # Register embedded wallet via hook
      components.ts             # React wrappers for Lit components

    app/
      index.html                # Web wallet app entry point
      main.ts                   # App initialization
      request-handler.ts        # Handles incoming PostMessage requests

    bin/
      cli.ts                    # `npx @mysten/dev-wallet serve` entry point
```

### Subpath Exports

```json
{
	".": "src/index.ts",
	"./adapters": "src/adapters/index.ts",
	"./client": "src/client/index.ts",
	"./ui": "src/ui/index.ts",
	"./react": "src/react/index.ts"
}
```

Note: `app/` and `bin/` are not library exports — they're the runnable web wallet.

---

## Key Interfaces

### SignerAdapter

Each adapter manages accounts and provides `Signer` instances. What operations are supported is up
to each implementation.

```typescript
interface ManagedAccount {
	address: string;
	label: string;
	signer: Signer; // from @mysten/sui/cryptography
	walletAccount: ReadonlyWalletAccount; // from @mysten/wallet-standard
}

interface SignerAdapter {
	readonly id: string;
	readonly name: string;

	initialize(): Promise<void>;
	getAccounts(): ManagedAccount[];
	getAccount(address: string): ManagedAccount | undefined;

	// Optional — implementations declare what they support
	createAccount?(options?: CreateAccountOptions): Promise<ManagedAccount>;
	removeAccount?(address: string): Promise<boolean>;

	onAccountsChanged(callback: (accounts: ManagedAccount[]) => void): () => void;
	destroy(): void;
}
```

### DevWallet

Implements wallet-standard `Wallet`. Takes one or more `SignerAdapter` instances and aggregates
their accounts into a single wallet. When signing, the wallet searches all adapters to find the
right signer for the account being used.

```typescript
interface DevWalletConfig {
	adapters: SignerAdapter[];
	clients: Record<string, ClientWithCoreApi>;
	name?: string; // default: 'Dev Wallet'
	icon?: string; // data URI
	autoApprove?: boolean | ((request) => boolean);
}

class DevWallet implements Wallet {
	constructor(config: DevWalletConfig);

	// Register in wallet-standard registry
	register(): () => void;

	// Mount UI components to the DOM
	mountUI(target?: HTMLElement): () => void;

	// Current pending signing request (or null)
	get pendingRequest(): WalletRequest | null;

	// All signer adapters backing this wallet
	get adapters(): readonly SignerAdapter[];

	// Find which adapter owns a given account
	getAdapterForAccount(address: string): SignerAdapter | undefined;

	// Get adapters that support createAccount
	getCreatableAdapters(): SignerAdapter[];

	// Approve the current pending request (signs and resolves)
	approveRequest(): Promise<void>;

	// Reject the current pending request
	rejectRequest(reason?: string): void;

	// Wallet interface properties
	get name(): string;
	get accounts(): ReadonlyWalletAccount[];
	get features(): WalletFeatures;
	// ...
}
```

**Signing flow:**

All signing requests are queued and require explicit approval. When a dApp calls
`signTransaction()`, `signAndExecuteTransaction()`, or `signPersonalMessage()`, the request is
stored as `pendingRequest` and the returned Promise blocks until `approveRequest()` or
`rejectRequest()` is called (by the wallet UI or programmatically). Only one request can be pending
at a time — additional requests are rejected immediately.

### DevWalletClient

The dApp-side wallet for connecting to a remote web wallet. Implements wallet-standard via
PostMessage popups, same pattern as SlushWallet.

```typescript
class DevWalletClient implements Wallet {
	static register(options: {
		name?: string;
		origin: string; // e.g. 'http://localhost:5174'
	}): () => void;

	// Implements Wallet interface
	// connect() → opens popup, exchanges session
	// signTransaction() → opens popup, waits for approval
	// etc.
}
```

### Wallet State (Nanostores)

```typescript
$walletState = atom<{
	accounts: ReadonlyWalletAccount[];
	activeAccountIndex: number;
	activeNetwork: string;
	isInitialized: boolean;
}>;

$currentRequest = atom<WalletRequest | null>; // pending sign request
$drawerOpen = atom<boolean>; // UI drawer visibility
```

---

## Signer Adapters

### InMemorySignerAdapter

- Creates random `Ed25519Keypair` instances in memory
- Supports: `createAccount`, `removeAccount`
- No persistence — ephemeral by design
- Replaces the existing burner wallet behavior

### WebCryptoSignerAdapter

- Wraps `WebCryptoSigner` from `@mysten/signers/webcrypto`
- Persists keys in IndexedDB via `idb-keyval`
- Secp256r1 (P-256) key scheme
- Supports: `createAccount`, `removeAccount`
- Good for: persistent browser-based dev wallets, hosted web wallet

### SuiCliSignerAdapter

- Node.js only — used by the web wallet app when run locally
- Discovers accounts: `sui client addresses --json`
- Signs: `sui keytool sign --address <addr> --data <base64> --json`
- Creates accounts: `sui client new-address ed25519 --json`
- Good for: using your existing local Sui keystore during development

### KeystoreSignerAdapter (future)

- Reads `~/.sui/sui_config/sui.keystore` directly
- Signs in-process using SDK keypair classes
- Faster than shelling out to CLI, same keys

---

## Web Wallet App

The web wallet app is a Vite application that:

1. Receives requests from dApps via `WalletPostMessageChannel` (from `@mysten/window-wallet-core`)
2. Renders the wallet UI for account management and signing approval
3. Responds to requests via `postMessage` back to the dApp

It follows the same architecture as Enoki Connect (`~/code/enoki/apps/connect/`):

- Request data is encoded in the URL hash
- The app decodes the request, renders an approval UI
- User approves → wallet signs → response sent back via `window.opener.postMessage`

The CLI entry (`bin/cli.ts`) starts a Vite dev server serving this app. It auto-detects which
adapters are available (e.g., enables CLI signing when the `sui` binary is found on PATH).

---

## UI Components (Lit Web Components)

| Component       | Element Name               | Purpose                                       |
| --------------- | -------------------------- | --------------------------------------------- |
| DevWalletDrawer | `<dev-wallet-drawer>`      | Slide-in panel containing all wallet UI       |
| SigningModal    | `<dev-wallet-signing>`     | Approve/reject transaction or message signing |
| AccountManager  | `<dev-wallet-accounts>`    | List, switch, add, remove accounts            |
| BalanceDisplay  | `<dev-wallet-balances>`    | Show SUI and token balances                   |
| AccountDialog   | `<dev-wallet-new-account>` | Create new account dialog                     |

Components subscribe to nanostores atoms and re-render reactively. Used by both embedded wallets and
the web wallet app. React wrappers available via `@mysten/dev-wallet/react`.

---

## React Integration

### useDevWallet Hook

```typescript
import { useDevWallet } from '@mysten/dev-wallet/react';
import { InMemorySignerAdapter } from '@mysten/dev-wallet/adapters';

const adapters = [new InMemorySignerAdapter()];

function App() {
  useDevWallet({
    adapters,
    clients: { testnet: client },
    createInitialAccount: true,
  });

  return <WalletProvider>...</WalletProvider>;
}
```

---

## Dependencies

### Reused (no changes needed)

| Package                        | What's reused                                                             |
| ------------------------------ | ------------------------------------------------------------------------- |
| `@mysten/wallet-standard`      | Wallet interface, ReadonlyWalletAccount, SUI_CHAINS, feature types        |
| `@mysten/sui/cryptography`     | Signer abstract class, decodeSuiPrivateKey                                |
| `@mysten/sui/keypairs/ed25519` | Ed25519Keypair for InMemorySignerAdapter                                  |
| `@mysten/signers/webcrypto`    | WebCryptoSigner for WebCryptoSignerAdapter                                |
| `@mysten/window-wallet-core`   | PostMessage channels, JWT sessions (for DevWalletClient + web wallet app) |
| `@mysten/wallet-sdk`           | Transaction analyzer for signing approval UI                              |
| `@mysten/utils`                | mitt event emitter                                                        |

### New dependencies

| Package             | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| `lit`               | Web Components framework                        |
| `nanostores`        | Framework-agnostic reactive state               |
| `idb-keyval`        | IndexedDB helpers for WebCrypto key persistence |
| `@nanostores/react` | React bindings (peer dep)                       |
| `@lit/react`        | React wrappers for Lit components (peer dep)    |

---

## Migration from useUnsafeBurnerWallet

1. `useDevWallet` with `InMemorySignerAdapter` replaces the burner wallet. Unlike the burner wallet
   which auto-signed everything, DevWallet provides a real approval UI so developers can inspect
   what they're signing.
2. Add deprecation warning to `useUnsafeBurnerWallet` pointing to `@mysten/dev-wallet/react`
3. Optionally add `devWallet` prop to dapp-kit's `WalletProvider`

---

## Implementation Phases

### Phase 1: Core + InMemory Adapter

- Package scaffold
- `SignerAdapter` interface and types
- `InMemorySignerAdapter`
- `DevWallet` class (wallet-standard, request queue signing flow)
- Unit tests

### Phase 2: Wallet State + WebCrypto Adapter

- Nanostores state management
- `WebCryptoSignerAdapter` with IndexedDB

### Phase 3: UI Components

- Lit web components
- `DevWallet.mountUI()` for embedded use

### Phase 4: React Integration

- `useDevWallet` hook
- React-wrapped components

### Phase 5: Web Wallet App + Client

- `DevWalletClient` (dApp-side PostMessage wallet)
- Web wallet app (Vite + request handling)
- `SuiCliSignerAdapter`
- CLI entry point (`npx @mysten/dev-wallet serve`)

### Phase 6: Polish

- `KeystoreSignerAdapter`
- Auto-approval policies
- Documentation
