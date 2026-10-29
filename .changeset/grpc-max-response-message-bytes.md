---
'@mysten/sui': minor
---

Add a `maxResponseMessageBytes` option to `GrpcWebFetchTransport` and `SuiGrpcClient` (default 64 MiB). It caps each response message read by the SDK's internal on-demand gRPC-web stream reader; a larger message fails with a non-retryable `RESOURCE_EXHAUSTED`. It does not apply to unary calls or `serverStreaming`.
