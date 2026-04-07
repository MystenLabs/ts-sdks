---
'@mysten/sui': minor
---

Re-export `GrpcWebFetchTransport`, `GrpcWebOptions`, and `RpcTransport` from `@mysten/sui/grpc` so users can configure custom transports without adding `@protobuf-ts/*` as direct dependencies.
