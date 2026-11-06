---
'@mysten/sui': patch
---

Return the same page cursors from `SuiGraphQLClient` `listTransactions` and `listEvents` as the gRPC client: an empty final page has `null` cursors, a final page ends at its last item, and a window that a server answers by repeating its cursor ends instead of reporting more pages forever.
