---
'@mysten/sui': minor
---

Add `listTransactions` and `listEvents` core API methods for querying transactions and events with filters, pagination, and ordering. The methods behave identically across the gRPC, GraphQL, and JSON-RPC transports. The regenerated gRPC protos also add the new `SubscribeTransactions` and `SubscribeEvents` subscription APIs.
