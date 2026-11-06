---
'@mysten/sui': major
---

Add `SuiGraphQLClient.subscribe` for typed GraphQL subscriptions over server-sent events, and the
`subscriptionUrl` client option. `SuiGraphQLRequestError` is also thrown for network failures and
unreadable or malformed response bodies, with a `reason` when retrying may help. The client's `url`
must be an absolute http(s) URL, or a path starting with `/` in a browser or with a custom `fetch`.
GraphQL response errors include `extensions`.
