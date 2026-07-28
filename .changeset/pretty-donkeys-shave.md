---
'@mysten/sui': patch
---

Enable gas selection in `core.simulateTransaction` for the gRPC and GraphQL clients when simulating built transaction bytes, or a `Transaction` with an explicitly set gas payment. This ensures transactions with an empty gas payment (`[]`) are simulated using the sender's address balance for gas rather than a mocked gas coin.
