---
'@mysten/sui': minor
---

Add `SuiGraphQLClient.subscribe` for typed GraphQL subscriptions over server-sent events, and the `subscriptionUrl` client option. `SuiGraphQLRequestError` now exposes `status` and `retryable`, and is also thrown for network failures and unreadable response bodies. GraphQL response errors include `extensions`.
