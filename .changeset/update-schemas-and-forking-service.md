---
'@mysten/sui': minor
---

Regenerate gRPC, GraphQL, and JSON-RPC types from upstream sources, and
add a `ForkingService` gRPC client for use against `sui-fork` instances.

- gRPC: `AccumulatorWrite` splits the old `value` field into
  `integerValue` / `integerTuple` / `eventDigestValue` (authenticated
  events), with a new `EventDigestEntry` message and `AccumulatorValue`
  enum.
- GraphQL: new `verifySignature` query (deprecates
  `verifyZkLoginSignature`), `IntentScope` enum, `SignatureVerifyResult`
  type, `digest` arg on `Query.checkpoint`, and `version` field on
  `TransactionEffects`.
- JSON-RPC: regenerated; `DisplayFieldsResponse.data` override from #993
  is preserved.
- `SuiGrpcClient` now exposes a `forkingService` member built from
  `sui/forking/v1alpha/forking_service.proto` (pulled from the `sui`
  repo, since it is not mirrored in `sui-apis`). The service is
  admin-only and works only against `sui-fork` instances; it serves on
  the same host/port as the regular Sui gRPC services on a fork.
