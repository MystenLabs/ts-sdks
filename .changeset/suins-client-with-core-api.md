---
'@mysten/suins': major
---

Update SuinsClient to use ClientWithCoreApi for transport-agnostic client support (JSON-RPC, GraphQL, gRPC).

**Breaking changes:**

- `SuinsClient` now requires a client implementing `ClientWithCoreApi` instead of `SuiClient`
- Package ID extraction now correctly uses `upgrade_cap.package` from state objects instead of object type

**Migration:**

```diff
- import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
+ import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
  import { SuinsClient } from '@mysten/suins';

- const suiClient = new SuiClient({ url: getFullnodeUrl('mainnet') });
+ const suiClient = new SuiJsonRpcClient({
+   url: getJsonRpcFullnodeUrl('mainnet'),
+   network: 'mainnet',
+ });

  const suinsClient = new SuinsClient({
    client: suiClient,
    network: 'mainnet',
  });
```

This change allows SuinsClient to work with any Sui client implementation (JSON-RPC, GraphQL, or gRPC).
