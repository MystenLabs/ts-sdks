---
'@mysten/deepbook-v3': patch
---

Set the transaction sender on all read-only query methods so they work under `SuiJsonRpcClient`. Previously these queries built a `Transaction` without calling `tx.setSender(...)`, which was tolerated by the gRPC core client (it substitutes `0x0` for a missing sender during resolution) but failed under JSON-RPC with `Missing transaction sender`. JSON-RPC is scheduled to be sunset on July 31, 2026 — migrate to `SuiGrpcClient` when possible.
