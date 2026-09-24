---
'@mysten/sui': minor
---

`SuiGrpcClient`, `GrpcWebFetchTransport`, and `SuiGraphQLClient` now send an `x-sui-client-protocol-version` header with the highest protocol version whose types the SDK can decode.
