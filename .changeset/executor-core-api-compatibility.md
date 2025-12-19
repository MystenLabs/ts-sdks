---
'@mysten/sui': minor
---

Update transaction executor APIs to accept `ClientWithCoreApi` for gRPC, GraphQL, and JSON-RPC compatibility.

**Breaking Changes:**

- `CachingTransactionExecutor`, `SerialTransactionExecutor`, and `ParallelTransactionExecutor` now accept any client implementing `ClientWithCoreApi` instead of requiring `SuiJsonRpcClient`
- The `executeTransaction()` return type changed: `data` property renamed to `result` and uses core API types (`SuiClientTypes.TransactionResult`)
- The second parameter of `executeTransaction()` changed from JSON-RPC options to core API `include` options
