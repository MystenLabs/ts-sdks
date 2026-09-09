---
'@mysten/sui': minor
---

Add resumable checkpoint, transaction, and event streams to the gRPC and GraphQL clients, with historical ranges, reverse traversal, polling, completion records, and automatic reconnect recovery. Add native typed GraphQL subscriptions over SSE and gRPC stream extensions for progress, native payloads and filters, and diagnostic query-end callbacks.

Add a transaction `kind` discriminated union covering programmable and system transactions, so `include: { transaction: true }` works for unfiltered reads and streams. Preserve the existing version-2 fields and programmable input/command representation. Both programmable kinds mirror their inputs and commands at the top level and in the kind payload; non-programmable kinds have empty top-level arrays and expose their data in `kind`.
