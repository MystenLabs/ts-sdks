---
'@mysten/sui': patch
---

Make gRPC and GraphQL transaction results match: GraphQL reads an event's `packageId` and `module` from the call that emitted it and reports the failing `command` for every execution error, Move abort locations no longer include the `function` index (now deprecated), and unchanged consensus objects without a version report `version: null`.
