---
'@mysten/sui': patch
---

Forward `signal` through every GraphQL client method. Twelve methods on
`GraphQLCoreClient` accepted an options object carrying `signal` but never passed it to the
underlying query, so `AbortSignal` was silently ignored on `getObjects`, `listOwnedObjects`,
`listCoins`, `getBalance`, `listBalances`, `getCoinMetadata`, `getTransaction`,
`executeTransaction`, `simulateTransaction`, `getMoveFunction`, `verifyZkLoginSignature`, and
`SuiGraphQLClient.listDynamicFields`.

`getReferenceGasPrice` now accepts options on `GraphQLCoreClient` and on both top-level clients; it
previously took no arguments at all, so callers had no way to pass a signal.

`GraphQLCoreClient.getChainIdentifier` now races the caller's signal against its cached read, the
same way the gRPC implementation does. The cached request itself stays uncancelled, since it is
shared between callers, but each caller can stop waiting independently.
