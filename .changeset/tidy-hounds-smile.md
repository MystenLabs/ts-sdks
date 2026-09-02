---
'@mysten/sui': minor
---

`GrpcWebFetchTransport` exported from `@mysten/sui/grpc` is now a subclass of the transport of the
same name from `@protobuf-ts/grpcweb-transport`, fixing two defects in it. Status messages are
decoded instead of arriving percent-encoded as `Object%20not%20found:%200x1`. A request ended by
an abort takes its status from the reason: `DEADLINE_EXCEEDED` for an `AbortSignal.timeout`, the
status a reason carrying one gives, and `CANCELLED` for anything else, where upstream reports all
but a standard `AbortError` as `INTERNAL`. An abort once the response has started arriving keeps
upstream's status.

`@mysten/sui/grpc` also exports the `RpcError` class and the `GrpcStatusCode` enum, so the errors
gRPC calls produce can be narrowed and coded without a direct `@protobuf-ts/*` dependency.

`SuiGrpcClient` builds one of these by default and now forwards the rest of `GrpcWebOptions`
(`fetch`, `format`, `meta`, `timeout`, `abort`, `interceptors`, `jsonOptions`, `binaryOptions`) to
it, which were previously accepted and ignored. A transport passed in by the caller is used as
given.
