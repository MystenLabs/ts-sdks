---
'@mysten/sui': major
---

Remove the deprecated JSON-RPC transport. Use `SuiGrpcClient` from `@mysten/sui/grpc` (recommended)
or `SuiGraphQLClient` from `@mysten/sui/graphql`; both implement the same core API and top-level
methods. See [Migrating from JSON-RPC](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration) for method-by-method
replacements, and [Migrate to 3.0](https://sdk.mystenlabs.com/sui/migrations/sui-3.0) for the other
breaking changes in this release.

Removed:

- The JSON-RPC client and everything `@mysten/sui/jsonRpc` exported, including `SuiJsonRpcClient`,
  `isSuiJsonRpcClient`, `JsonRpcHTTPTransport`, `JsonRpcError`, `SuiHTTPStatusError`,
  `getJsonRpcFullnodeUrl`, and all JSON-RPC request/response types (`SuiTransactionBlockResponse`,
  `SuiObjectResponse`, `SuiMoveNormalizedType`, `ObjectOwner`, `DevInspectResults`, ...). Pass a
  full node URL such as `https://fullnode.mainnet.sui.io:443` directly to `SuiGrpcClient`'s
  `baseUrl`. The `@mysten/sui/jsonRpc` entry point still exists so packages that import it keep
  loading, but its classes and functions throw, `isSuiJsonRpcClient` returns `false`, and its types
  are `any`.
- `normalizedTypeToMoveTypeSignature` from `@mysten/sui/transactions`, which converted JSON-RPC
  normalized Move types to `SuiClientTypes.OpenSignature`. The core API's `getMoveFunction` already
  returns `OpenSignature`s.
- Support for untyped pure values (`UnresolvedPure` inputs, such as raw Move call arguments in v1
  transaction JSON restored with `Transaction.from`). `SuiJsonRpcClient` serialized them from the
  Move function signature; `SuiGrpcClient` and `SuiGraphQLClient` reject them. Pass typed values
  such as `tx.pure.u64(...)` instead.
