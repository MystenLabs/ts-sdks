---
'@mysten/sui': patch
---

The GraphQL client reports `0x0` as the sender of system transaction events, matching gRPC. `listEvents` no longer throws on them, and transaction results with `include: { events: true }` no longer leave `sender` undefined.
