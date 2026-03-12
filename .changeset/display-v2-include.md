---
'@mysten/sui': minor
---

Add `include: { display: true }` support to `getObject`, `getObjects`, and `listOwnedObjects` across all three transports (gRPC, GraphQL, JSON-RPC). Returns a `Display` object with `output` and `errors` fields when a Display template exists for the object type, or `null` when no template is registered.
