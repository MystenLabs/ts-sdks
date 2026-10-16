---
'@mysten/sui': minor
---

Add `listCheckpoints` to the Core API and as a top-level method on `SuiGrpcClient` and
`SuiGraphQLClient`. It pages through checkpoint summaries with the same `limit`, `order`, cursor,
and checkpoint range options as `listTransactions` and `listEvents`.
