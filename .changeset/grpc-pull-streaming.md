---
'@mysten/sui': minor
---

Read gRPC ledger streams on demand: the default gRPC-web transport now reads and decodes server-streaming responses only as the consumer pulls them, so a paused stream no longer accumulates decoded messages. `GrpcWebFetchTransport` gains `serverStreamingIterable` and a `maxResponseMessageBytes` option (default 64 MiB, also accepted by `SuiGrpcClient`) that rejects oversized messages before buffering them. `@mysten/sui/grpc` exports the `PullServerStreamingTransport` and `ServerStreamingIterableCall` types and the `supportsServerStreamingIterable` guard for custom transports, plus `normalizeGrpcError`, `grpcStatusFromAbortReason`, `markGrpcStatusMessageDecoded` and `hasDecodedStatusMessage` so they report errors the way the gRPC client does. Injected transports without the capability, and transports with interceptors, keep using the bounded stream buffer.

`markNonRetryable` and `isNonRetryable` are exported from `@mysten/sui/grpc` so custom transports can flag errors the ledger streams must not retry.
