---
'@mysten/sui': major
---

The gRPC-web transport now uses the binary wire format by default, both when `SuiGrpcClient` builds
it and when `GrpcWebFetchTransport` from `@mysten/sui/grpc` is constructed directly. This removes the
base64 overhead of the text format (about a third more bytes than binary). Pass `format: 'text'` for
proxies that only support base64 gRPC-web framing.
