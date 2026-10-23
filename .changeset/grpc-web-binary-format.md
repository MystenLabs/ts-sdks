---
'@mysten/sui': major
---

The gRPC-web transport, whether built by `SuiGrpcClient` or constructed as `GrpcWebFetchTransport`
from `@mysten/sui/grpc`, now uses the smaller binary wire format by default instead of base64 text.
Pass `format: 'text'` for proxies that only support the text format.
