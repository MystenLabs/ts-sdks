---
'@mysten/sui': patch
---

Fix pagination options being dropped on the unified core client.

`GraphQLCoreClient.listBalances` now forwards the `limit` and `cursor` options to the
underlying query (previously both were ignored, so it always returned the full, unpaginated
list). `GrpcCoreClient.listCoins` now forwards `limit` as the request `pageSize` (previously
only `cursor` was passed, so `limit` had no effect). This brings both methods in line with the
other transports and list methods.
