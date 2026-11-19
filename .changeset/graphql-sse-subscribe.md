---
'@mysten/sui': minor
---

Add `SuiGraphQLClient.subscribe` for typed GraphQL subscriptions over server-sent events, and the
`subscriptionUrl` client option. By default the subscription endpoint is derived from the client
URL after resolving a relative URL against the page as `fetch` does, so page-relative URLs send
queries and subscriptions to the same endpoint, and a custom `fetch` receives the resolved URL.
Absolute URLs, and relative URLs where there is no page, are sent unchanged.
`SuiGraphQLRequestError` now exposes `status` and `retryable`, and is also thrown for network
failures and unreadable response bodies. When `fetch` fails for a URL that isn't http(s), the error
is non-retryable, except for a relative URL the page can't resolve, which is left to a custom
`fetch`. GraphQL response errors include `extensions`.
