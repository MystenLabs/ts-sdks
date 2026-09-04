---
'@mysten/sui': patch
---

`SuiJsonRpcClient` core transaction reads now report the genesis transaction's placeholder
signature, matching gRPC and GraphQL, instead of an empty signature list.
