---
'@mysten/sui': minor
---

Add resumable checkpoint, transaction, and event streams to the gRPC and GraphQL clients, with historical ranges, reverse traversal, polling, completion records, and automatic reconnect recovery. Add native typed GraphQL subscriptions over SSE and gRPC stream extensions for progress, native payloads and filters, and diagnostic query-end callbacks.

Support system transactions in Core reads and streams. Transaction data includes a `kind` discriminated union. The deprecated top-level `inputs` and `commands` mirror both programmable kinds and are empty for non-programmable kinds.
