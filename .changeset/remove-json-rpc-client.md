---
'@mysten/sui': major
---

Remove the deprecated JSON-RPC transport. Use `SuiGrpcClient` from `@mysten/sui/grpc` (recommended)
or `SuiGraphQLClient` from `@mysten/sui/graphql`; both implement the same core API and top-level
methods. See [Migrating from JSON-RPC](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration) for method-by-method
replacements.

Removed:

- The `@mysten/sui/jsonRpc` entry point and everything it exported, including `SuiJsonRpcClient`,
  `isSuiJsonRpcClient`, `JsonRpcHTTPTransport`, `JsonRpcError`, `SuiHTTPStatusError`,
  `getJsonRpcFullnodeUrl`, and all JSON-RPC request/response types (`SuiTransactionBlockResponse`,
  `SuiObjectResponse`, `SuiMoveNormalizedType`, `ObjectOwner`, `DevInspectResults`, ...). Pass a
  full node URL such as `https://fullnode.mainnet.sui.io:443` directly to `SuiGrpcClient`'s
  `baseUrl`.
- `normalizedTypeToMoveTypeSignature` from `@mysten/sui/transactions`, which converted JSON-RPC
  normalized Move types to `SuiClientTypes.OpenSignature`. The core API's `getMoveFunction` already
  returns `OpenSignature`s.

Raw (untyped) pure values, such as those in a transaction restored from v1 JSON, are now resolved
on every client before server-side resolution, so the gRPC and GraphQL clients can build them.
