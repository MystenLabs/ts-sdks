# @mysten/dev-wallet

A modular dev wallet for Sui with pluggable key management, wallet-standard compliance, and a
request-queue signing flow. Replaces `useUnsafeBurnerWallet` with a real approval UI so developers
can inspect what they're signing during development.

## Installation

```bash
npm install @mysten/dev-wallet
```

## Quick Start

### Embedded in a dApp

The simplest setup — create an adapter, create a wallet, and register it. Your existing dapp-kit
code works unchanged.

```typescript
import { DevWallet } from '@mysten/dev-wallet';
import { InMemorySignerAdapter } from '@mysten/dev-wallet/adapters';
import { mountDevWallet } from '@mysten/dev-wallet/ui';
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';

const adapter = new InMemorySignerAdapter();
await adapter.initialize();
await adapter.createAccount({ label: 'Dev Account' });

const wallet = new DevWallet({
	adapter,
	clients: {
		testnet: new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' }),
	},
});

wallet.register(); // registers with wallet-standard
mountDevWallet(wallet); // appends floating drawer to document.body
```

### With React

```tsx
import { useDevWallet } from '@mysten/dev-wallet/react';
import { InMemorySignerAdapter } from '@mysten/dev-wallet/adapters';

const adapter = useMemo(() => new InMemorySignerAdapter(), []);
const clients = useMemo(
	() => ({
		testnet: new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('testnet'), network: 'testnet' }),
	}),
	[],
);

function App() {
	const wallet = useDevWallet({ adapter, clients, createInitialAccount: true });
	return <WalletProvider>{/* dapp-kit hooks work normally */}</WalletProvider>;
}
```

### Auto-Approval (Burner Wallet Replacement)

For tests or CI where you want transactions signed without user interaction:

```typescript
const wallet = new DevWallet({
	adapter,
	clients,
	autoApprove: true, // signs everything immediately — no queue, no UI
});
```

For fine-grained control:

```typescript
const wallet = new DevWallet({
	adapter,
	clients,
	autoApprove: (request) => request.type === 'sign-personal-message',
});
```

### Standalone Web Wallet (npx)

Run a full wallet UI as a standalone web app. dApps connect via popup, same as production wallets.

```bash
npx @mysten/dev-wallet serve --adapter=cli --port=5174
npx @mysten/dev-wallet serve --adapter=webcrypto
npx @mysten/dev-wallet serve --adapter=memory
```

On the dApp side, register a client that opens popups to the web wallet:

```typescript
import { DevWalletClient } from '@mysten/dev-wallet/client';

const unregister = DevWalletClient.register({
	origin: 'http://localhost:5174',
});
```

## Signer Adapters

Adapters manage keys and provide `Signer` instances. Import from `@mysten/dev-wallet/adapters`.

### InMemorySignerAdapter

Ephemeral Ed25519 keypairs in memory. Supports `createAccount` and `removeAccount`. No persistence.

```typescript
const adapter = new InMemorySignerAdapter();
await adapter.initialize();
const account = await adapter.createAccount({ label: 'Test' });
```

### WebCryptoSignerAdapter

Secp256r1 keys via WebCrypto API, persisted in IndexedDB. Good for persistent browser-based dev
wallets.

```typescript
const adapter = new WebCryptoSignerAdapter();
await adapter.initialize(); // loads existing keys from IndexedDB
await adapter.createAccount({ label: 'Persistent Key' });
```

## Subpath Exports

| Export                        | Contents                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------- |
| `@mysten/dev-wallet`          | `DevWallet`, types (`DevWalletConfig`, `WalletRequest`, `AutoApprovePolicy`) |
| `@mysten/dev-wallet/adapters` | Signer adapters (InMemory, WebCrypto, Passkey, RemoteCli) + `SignerAdapter`  |
| `@mysten/dev-wallet/ui`       | Lit web components + `mountDevWallet()`                                      |
| `@mysten/dev-wallet/react`    | `useDevWallet` hook, React-wrapped Lit components                            |
| `@mysten/dev-wallet/client`   | `DevWalletClient` (dApp-side PostMessage wallet)                             |
| `@mysten/dev-wallet/server`   | `parseWalletRequest()` (web wallet app handler)                              |

## Signing Flow

All signing requests are queued and require explicit approval:

1. dApp calls `signTransaction()`, `signPersonalMessage()`, or `signAndExecuteTransaction()`
2. Request is stored as `wallet.pendingRequest` and the returned Promise blocks
3. Wallet UI (or your code) calls `wallet.approveRequest()` or `wallet.rejectRequest()`
4. The Promise resolves or rejects accordingly

Only one request can be pending at a time. Additional requests are rejected immediately.

When `autoApprove` is set, matching requests bypass the queue and sign directly.

## API

### DevWallet

```typescript
class DevWallet implements Wallet {
	constructor(config: DevWalletConfig);

	register(): () => void; // register with wallet-standard
	get pendingRequest(): WalletRequest | null;
	get adapter(): SignerAdapter;

	approveRequest(): Promise<void>;
	rejectRequest(reason?: string): void;
}
```

### DevWalletConfig

```typescript
interface DevWalletConfig {
	adapter: SignerAdapter;
	clients: Record<string, ClientWithCoreApi>; // network name → SuiClient
	name?: string; // default: 'Dev Wallet'
	icon?: WalletIcon;
	autoApprove?: boolean | ((request: { type; account; chain; data }) => boolean);
}
```

### SignerAdapter

```typescript
interface SignerAdapter {
	readonly id: string;
	readonly name: string;

	initialize(): Promise<void>;
	getAccounts(): ManagedAccount[];
	getAccount(address: string): ManagedAccount | undefined;

	createAccount?(options?: CreateAccountOptions): Promise<ManagedAccount>;
	removeAccount?(address: string): Promise<boolean>;

	onAccountsChanged(callback: (accounts: ManagedAccount[]) => void): () => void;
	destroy(): void;
}
```

### useDevWallet

```typescript
function useDevWallet(options: UseDevWalletOptions): DevWallet | null;

interface UseDevWalletOptions {
	adapter: SignerAdapter;
	clients: Record<string, ClientWithCoreApi>;
	name?: string;
	icon?: WalletIcon;
	autoInitialize?: boolean; // default: true
	createInitialAccount?: boolean; // default: true
	mountUI?: boolean; // default: true
	container?: HTMLElement;
}
```
