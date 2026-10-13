---
'@mysten/sui': minor
---

Add `listCheckpoints` to the Core API. It pages through checkpoint summaries (`sequenceNumber`,
`digest`, `epoch`, and `timestampMs` in milliseconds since the Unix epoch) on `client.core` and as a top-level method on
`SuiGrpcClient` and `SuiGraphQLClient`, with the same `limit`, `order`, `after`/`before` cursors,
and `startCheckpoint`/`endCheckpoint` range as `listTransactions` and `listEvents`.
