---
'@mysten/sui': patch
---

Complete `signal` forwarding across the remaining client call sites.
`CoreClient.getDynamicObjectField` now passes the caller's signal into its MVR type resolution,
matching the sibling `getDynamicField` path, so aborting takes effect before resolution rather than
after it.

On the deprecated JSON-RPC client, `listDynamicFields`, `verifyZkLoginSignature`, and
`getMoveFunction` now forward the signal to the underlying request, `simulateTransaction` forwards it
to the reference gas price lookup it performs while building, and `getChainIdentifier` races the
signal against its cached read the way the gRPC and GraphQL clients do.
