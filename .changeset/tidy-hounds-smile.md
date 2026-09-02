---
'@mysten/sui': patch
---

`GrpcWebFetchTransport` exported from `@mysten/sui/grpc` is now a subclass of the transport of the
same name from `@protobuf-ts/grpcweb-transport`, fixing three defects in it. Status messages are
decoded instead of arriving percent-encoded as `Object%20not%20found:%200x1`. A call ended by its
own signal is coded `DEADLINE_EXCEEDED` or `CANCELLED` instead of `INTERNAL`. `timeout` is enforced
as a deadline instead of only being sent as the `grpc-timeout` header, so a stalled connection fails
instead of hanging.

`SuiGrpcClient` builds one of these by default and now forwards the rest of `GrpcWebOptions`
(`fetch`, `format`, `meta`, `timeout`, `interceptors`, `jsonOptions`, `binaryOptions`) to it, which
were previously accepted and ignored. A transport passed in by the caller is used as given.
