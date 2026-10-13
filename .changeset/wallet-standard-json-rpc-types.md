---
'@mysten/wallet-standard': minor
---

Export the legacy JSON-RPC response types used by the deprecated `sui:signAndExecuteTransactionBlock` feature as the `SuiJsonRpcTypes` namespace (for example `SuiJsonRpcTypes.SuiTransactionBlockResponse`). These were previously available from `@mysten/sui/jsonRpc`, which has been removed. They are grouped under a namespace because several of their names collide with differently shaped types in `@mysten/sui`. All of them are deprecated.
