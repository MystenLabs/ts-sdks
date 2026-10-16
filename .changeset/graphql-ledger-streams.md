---
'@mysten/sui': minor
---

Add resumable ledger streams to `SuiGraphQLClient`: `streamCheckpoints`, `streamTransactions` and `streamEvents` (also on `client.core`). Streams replay history, follow new data over GraphQL subscriptions (or `delivery: 'poll'`), and resume from any frame's `resumeToken`. Streamed transactions match `listTransactions`, including the first-50 limit on nested events and object changes. GraphQL streams report response `errors` as `SuiGraphQLRequestError` (retryable for transient error codes). Transaction events without a sender now report the zero address on GraphQL, as on gRPC.
