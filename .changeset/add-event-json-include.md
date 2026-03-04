---
'@mysten/sui': minor
---

Add `json` field to event data in transaction responses. When `events: true` is included, each event now contains a `json` field with the JSON representation of the event's Move struct data (or `null` if unavailable). Supported across all three transports (gRPC, GraphQL, JSON-RPC).
