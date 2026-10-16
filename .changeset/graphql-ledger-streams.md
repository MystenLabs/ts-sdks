---
'@mysten/sui': minor
---

Add resumable ledger streams to `SuiGraphQLClient`: `streamCheckpoints`, `streamTransactions` and `streamEvents`, also on `client.core`. `SuiGraphQLClient.subscribe` accepts an `onOpen` callback. GraphQL transaction events without a sender now report the zero address, as on gRPC.
