---
'@mysten/deepbook-v3': major
---

### Breaking Changes

**Renamed `env` option to `network`**

The `env` option has been renamed to `network` throughout the SDK to align with the standard `SuiClientTypes.Network` type used across other packages.

```diff
const dbClient = new DeepBookClient({
   address: '0x...',
-  env: 'mainnet',
+  network: 'mainnet',
   client: suiClient,
});
```

**Removed `Environment` type export**

The `Environment` type has been removed. Use `SuiClientTypes.Network` from `@mysten/sui/client` instead:

```diff
-import { Environment } from '@mysten/deepbook-v3';
+import type { SuiClientTypes } from '@mysten/sui/client';

-const env: Environment = 'mainnet';
+const network: SuiClientTypes.Network = 'mainnet';
```

**Client extension auto-detects network**

The `deepbook()` client extension function no longer accepts a `network` option. The network is automatically derived from the client:

```diff
const client = new SuiGrpcClient({ network: 'mainnet', baseUrl: '...' }).$extend(
   deepbook({
     address: '0x...',
-    env: 'mainnet',  // No longer needed - auto-detected from client
   }),
);
```

**Network validation**

The SDK now throws an error if the network is not `'mainnet'` or `'testnet'`, as DeepBook only supports these networks.
