---
'@mysten/sui': minor
---

Add `SuiGraphQLClient.subscribe` for typed GraphQL subscriptions over server-sent events, and the
`subscriptionUrl` client option. By default the subscription endpoint is derived from the client
URL after resolving it against the page as `fetch` does, so page-relative URLs send queries and
subscriptions to the same endpoint, and a custom `fetch` receives the resolved absolute URL.
`SuiGraphQLRequestError` now exposes `status` and `retryable`, and is also thrown for network
failures and unreadable response bodies; a URL that isn't http(s), such as one without a scheme,
fails with a non-retryable error. GraphQL response errors include `extensions`.
