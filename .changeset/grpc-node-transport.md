---
'@mysten/grpc-node-transport': minor
'@mysten/sui': minor
---

Add `@mysten/grpc-node-transport`, a native gRPC (HTTP/2) transport for `SuiGrpcClient` on Node.js built on `@grpc/grpc-js`, with on-demand ledger streams and keepalive pings. `@mysten/sui/grpc/pull-transport` exports the interface it implements, for other transport implementations.
