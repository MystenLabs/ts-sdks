---
'@mysten/sui': major
---

Remove SuiClient exports from @mysten/sui/client

BREAKING CHANGE: All exports from `@mysten/sui/client` have been removed. Use `@mysten/sui/jsonRpc` instead:

- `SuiClient` -> `SuiJsonRpcClient`
- `SuiClientOptions` -> `SuiJsonRpcClientOptions`
- `isSuiClient` -> `isSuiJsonRpcClient`
- `SuiTransport` -> `JsonRpcTransport`
- `getFullnodeUrl` -> `getJsonRpcFullnodeUrl`

Migration example:
```ts
// Before
import { SuiClient, getFullnodeUrl } from '@mysten/sui/client';
const client = new SuiClient({ url: getFullnodeUrl('devnet'), network: 'devnet' });

// After
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from '@mysten/sui/jsonRpc';
const client = new SuiJsonRpcClient({ url: getJsonRpcFullnodeUrl('devnet'), network: 'devnet' });
```
