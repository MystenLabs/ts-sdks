---
'@mysten/sui': minor
---

Add resumable ledger streams: `streamCheckpoints`, `streamTransactions` and `streamEvents` on `SuiGrpcClient`, `SuiGraphQLClient` and `client.core`. Streams read history in either order, follow new checkpoints live, reconnect automatically, and give every item a `resumeToken` to resume from. With `include: { transactions }`, `streamCheckpoints` delivers each checkpoint with all of its transactions. Errors the stream raises are `SuiStreamError`s, a subclass of `SuiClientError`; on `SuiGrpcClient`, `grpcFilter` accepts a native gRPC filter.
