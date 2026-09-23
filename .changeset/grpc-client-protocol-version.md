---
'@mysten/sui': minor
---

`SuiGrpcClient` and `GrpcWebFetchTransport` now send an `x-sui-client-protocol-version` header with the highest protocol version whose types the SDK can decode.
