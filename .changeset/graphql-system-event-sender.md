---
'@mysten/sui': patch
---

GraphQL `listEvents` reports events from system transactions, which have no sender, with the `0x0` sender (matching gRPC) instead of throwing.
