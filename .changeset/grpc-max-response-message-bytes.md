---
'@mysten/sui': minor
---

Add a `maxResponseMessageBytes` option to `GrpcWebFetchTransport` and `SuiGrpcClient` (exported type `GrpcWebFetchTransportOptions`). It caps the size of a response message read by the SDK's internal on-demand server-stream reader (default 64 MiB); a larger message fails with a non-retryable `RESOURCE_EXHAUSTED` before its payload is buffered. It does not apply to unary calls or to `serverStreaming`.
