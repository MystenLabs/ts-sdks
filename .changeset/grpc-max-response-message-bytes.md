---
'@mysten/sui': minor
---

Add a `maxResponseMessageBytes` option to `GrpcWebFetchTransport` and `SuiGrpcClient` (default 64 MiB). It caps response messages on SDK-managed server streams; a larger message fails with a non-retryable `RESOURCE_EXHAUSTED`.
