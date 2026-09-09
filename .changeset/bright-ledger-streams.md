---
'@mysten/sui': major
---

Add resumable checkpoint, transaction, and event streams to the gRPC and GraphQL clients, with historical ranges, reverse traversal, polling, completion records, and automatic reconnect recovery. Add native typed GraphQL subscriptions over SSE and gRPC stream extensions for progress, native payloads and filters, and query-end metadata.

Replace the programmable-only Core transaction-data read model with the full decoded ledger envelope `{ sender, gasData, expiration, kind }`. `kind` is a discriminated union covering programmable and system transactions, so `include: { transaction: true }` works for unfiltered reads and streams. Consumers must narrow `transaction.kind.$kind` and read programmable `inputs` and `commands` from its payload; the builder's version-2 snapshot API remains unchanged.
