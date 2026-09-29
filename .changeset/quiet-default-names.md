---
'@mysten/sui': patch
---

`client.core.defaultNameServiceName` now returns `{ data: { name: null } }` for an address without a default SuiNS name on the gRPC and GraphQL clients, matching JSON-RPC. Previously gRPC threw a `NOT_FOUND` `RpcError` and GraphQL threw `Missing response data`.
