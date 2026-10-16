---
'@mysten/sui': minor
---

Add resumable ledger streams: `streamCheckpoints`, `streamTransactions` and `streamEvents` on `CoreClient` and `SuiGrpcClient`. Streams read history in either order, follow new checkpoints live, reconnect automatically, and give every item a `resumeToken` to resume from. Errors the stream raises are `SuiStreamError`s, a subclass of `SuiClientError`; on `SuiGrpcClient`, `grpcFilter` accepts a native gRPC filter.
