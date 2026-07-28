---
'@mysten/sui': minor
---

Enable gas selection in `core.simulateTransaction` for the gRPC and GraphQL clients when the transaction's gas payment is explicitly set to an empty list (`[]`). This ensures transactions paying gas from the sender's address balance are simulated with real gas selection rather than a mocked gas coin. Transactions with gas coins set are simulated as-is, and transactions without a gas payment keep the mocked gas coin behavior. The default can be overridden by passing `doGasSelection` to `simulateTransaction` on `SuiGrpcClient` and `SuiGraphQLClient`.
