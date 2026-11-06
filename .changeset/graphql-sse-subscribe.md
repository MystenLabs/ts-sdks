---
'@mysten/sui': major
---

Add `SuiGraphQLClient.subscribe` for typed GraphQL subscriptions over server-sent events, and the
`subscriptionUrl` client option. `SuiGraphQLRequestError` now extends `SuiClientError` and is also
thrown for network failures and unreadable or malformed response bodies, with the original error as
`cause` and a `reason` (a new `SuiClientTypes.RetryReason`) when retrying may help. The client's
`url` must be an absolute http(s) URL or a path starting with `/`. GraphQL response errors include
`extensions`.
