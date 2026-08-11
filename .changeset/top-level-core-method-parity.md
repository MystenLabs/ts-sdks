---
'@mysten/sui': minor
---

Forward the last four Core API methods to the top-level clients. `getCurrentSystemState`,
`getProtocolConfig`, `getChainIdentifier`, and `getDynamicObjectField` were reachable only through
`client.core`, so `SuiGrpcClient` and `SuiGraphQLClient` now expose the complete Core API surface as
top-level methods.

Also fixes `GraphQLCoreClient.getCurrentSystemState` and `getProtocolConfig`, which declared no
parameters and so silently dropped the `signal` option the contract and the gRPC implementation both
accept. Both now forward `signal` to the underlying query.
