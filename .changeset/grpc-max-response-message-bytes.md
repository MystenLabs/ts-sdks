---
'@mysten/sui': minor
---

Add a `maxResponseMessageBytes` option to `GrpcWebFetchTransport` and `SuiGrpcClient` (default 64 MiB). It caps each response message of the ledger `stream*` methods when the client uses its own transport without interceptors; a larger message fails with a non-retryable `RESOURCE_EXHAUSTED`.
