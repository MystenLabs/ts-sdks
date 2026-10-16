---
'@mysten/sui': patch
---

GraphQL `listEvents` returns `0x0` as the sender of system transaction events, matching gRPC, instead of throwing.
