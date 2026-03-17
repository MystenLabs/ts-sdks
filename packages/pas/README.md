# @mysten/pas

TypeScript SDK for the [Permissioned Assets Standard](https://github.com/MystenLabs/pas) (PAS) on
Sui.

PAS lets asset issuers define transfer policies that are enforced on-chain. The SDK handles policy
resolution, account derivation, and transaction building so callers work with a simple intent-based
API.

## Installation

```bash
npm install @mysten/pas
```

## Setup

The PAS client plugs into any Sui client via the `$extend` pattern:

```typescript
import { SuiGrpcClient } from '@mysten/sui/grpc';
import { pas } from '@mysten/pas';

const client = new SuiGrpcClient({ network: 'testnet' }).$extend(pas());
```

The client auto-selects the correct on-chain package config for the connected network (mainnet or
testnet). For custom deployments (e.g. during localnet / CI testing) you can pass a `packageConfig`
explicitly:

```typescript
const client = new SuiGrpcClient({ network: 'testnet' }).$extend(
	pas({
		packageConfig: {
			packageId: '0x...',
			namespaceId: '0x...',
		},
	}),
);
```

## Reading data

Every PAS user has a deterministic **Account** address derived from their wallet address. You can
derive it locally — no network call needed — and then use regular Sui queries against it:

```typescript
const accountAddress = client.pas.deriveAccountAddress(ownerAddress);
```

Once you have the account address, use the standard core client to query balances, objects, or any
other on-chain state:

```typescript
const DEMO_USD = '0xabc...::demo_usd::DEMO_USD';

const [walletBalance, accountBalance] = await Promise.all([
	client.core.getBalance({ owner: ownerAddress, coinType: DEMO_USD }),
	client.core.getBalance({ owner: accountAddress, coinType: DEMO_USD }),
]);
```

Other derivation helpers are available for policies and templates:

```typescript
const policyAddress = client.pas.derivePolicyAddress(assetType);
const templateRegistryAddress = client.pas.deriveTemplateRegistryAddress();
```

## Writing transactions

Transactions use an intent-based API. You add intents to a `Transaction` and the SDK resolves them
at build time — fetching policies, approval templates, and creating accounts as needed.

### Transferring a permissioned asset

```typescript
import { Transaction } from '@mysten/sui/transactions';

const DEMO_USD = '0xabc...::demo_usd::DEMO_USD';

const tx = new Transaction();
tx.add(
	client.pas.call.sendBalance({
		from: senderAddress, // The sender address (NOT the account address)
		to: recipientAddress, // the recipient wallet address. NOT the account address.
		amount: 1_000_000,
		assetType: DEMO_USD,
	}),
);

// .. sign and execute
```

Under the hood, `sendBalance` will:

1. Derive the sender and recipient Account addresses.
2. Create any accounts that don't exist yet.
3. Fetch the issuer's `Policy` for the asset type and resolve the required approval template
   commands.
4. Build the full PTB (auth, request, approvals, resolve) in a single transaction.

## More resources

- [PAS repository](https://github.com/MystenLabs/pas) — Move contracts, architecture docs, and a
  full working example app
- [`@mysten/pas` on npm](https://www.npmjs.com/package/@mysten/pas)
