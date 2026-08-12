---
'@mysten/sui': patch
---

Forward the caller's `signal` into MVR name resolution and the remaining request paths.
`CoreClient.getDynamicObjectField` now passes it into the type resolution it performs before reading
the field, matching the sibling `getDynamicField` path.

On the deprecated JSON-RPC client, `listDynamicFields`, `verifyZkLoginSignature`, and
`getMoveFunction` forward the signal to their underlying requests, `simulateTransaction` forwards it
to the reference gas price lookup it performs while building, and `getChainIdentifier` races the
signal against its cached read the way the gRPC and GraphQL clients do. Fifteen MVR lookups in
`jsonRpc/client.ts` also went unsignalled, including the ones the Core `listCoins`, `getBalance`, and
`listOwnedObjects` paths reach, so a stalled resolution delayed cancellation on those methods.

One MVR call remains unsignalled by design: the named-packages transaction plugin, since
`BuildTransactionOptions` carries no signal to forward.
