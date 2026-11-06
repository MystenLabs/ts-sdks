---
'@mysten/sui': minor
---

Add resumable ledger streams: `streamCheckpoints`, `streamTransactions` and `streamEvents` on
`SuiGrpcClient`, `SuiGraphQLClient` and `client.core`. Streams read history in either order, follow
new checkpoints live, reconnect automatically, and give every item a `resumeToken` to resume from.
Stream errors are `SuiStreamError`s, and failed MVR requests throw `MvrRequestError`.
