---
'@mysten/sui': patch
---

Fix cancellation for signals that were already aborted, and forward the caller's signal into MVR
name resolution.

`raceSignal` registered an `abort` listener without first checking `signal.aborted`. An `abort`
event is not replayed for listeners added afterwards, so passing an already-aborted signal resolved
normally instead of rejecting. This affected every cached read that races a signal, including
`getChainIdentifier` on the gRPC and GraphQL clients.

Methods that resolve an MVR name before querying now pass the caller's signal into that lookup, so
aborting takes effect during name resolution rather than only afterwards. This covers
`listOwnedObjects`, `listCoins`, `getBalance`, `getCoinMetadata`, and `getMoveFunction` on the
GraphQL client, and `getCoinMetadata` and `getMoveFunction` on the deprecated JSON-RPC client.
