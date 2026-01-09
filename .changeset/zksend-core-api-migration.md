---
'@mysten/zksend': major
---

**BREAKING**: Migrate zkSend SDK to use a client extension pattern with the new core API for compatibility with gRPC, GraphQL, and JSON RPC transports.

### Breaking Changes

- The zkSend SDK now uses a client extension pattern (`client.$extend(zksend())`)
- Non-contract links are no longer supported - only contract-based links work
- The `contract` option no longer accepts `null`
- The `isContractLink` option has been removed from `ZkSendLink`
- The `calculateGas` option has been removed from `CreateZkSendLinkOptions`
- Data fetching helpers (`getAssetsFromTransaction`, `isOwner`, `ownedAfterChange`) have been removed from exports

### Migration

```typescript
// Before
import { ZkSendLinkBuilder, ZkSendLink } from '@mysten/zksend';

const builder = new ZkSendLinkBuilder({
	sender: address,
	network: 'mainnet',
	// client was optional, defaulting to SuiJsonRpcClient
});

const link = new ZkSendLink({
	keypair,
	network: 'mainnet',
	isContractLink: true,
	// client was optional
});

// After
import { zksend } from '@mysten/zksend';
import { SuiGrpcClient } from '@mysten/sui/grpc';
// Or use SuiJsonRpcClient, SuiGraphQLClient

const client = new SuiGrpcClient({
	baseUrl: 'https://fullnode.testnet.sui.io:443',
	network: 'testnet',
}).$extend(zksend());

// Create a link builder
const link = client.zksend.linkBuilder({
	sender: address,
});

link.addClaimableMist(100n);
link.addClaimableObject(objectId);

await link.create({
	signer: keypair,
	waitForTransaction: true,
});

// Load links (async, loads assets)
const loadedLink = await client.zksend.loadLink({
	address: linkAddress,
	// or: keypair: linkKeypair,
});

// Get links (sync, without loading assets)
const linkRef = client.zksend.getLink({ address: linkAddress });
await linkRef.loadAssets(); // load assets manually when needed

// Load from URL (async, loads assets)
const urlLink = await client.zksend.loadLinkFromUrl(linkUrl);

// Get from URL (sync, without loading assets)
const urlLinkRef = client.zksend.getLinkFromUrl(linkUrl);

// Bulk link creation
const links = [
	client.zksend.linkBuilder({ sender: address }),
	client.zksend.linkBuilder({ sender: address }),
];
const tx = await client.zksend.createLinks({ links });
```
