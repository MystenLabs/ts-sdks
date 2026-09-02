---
'@mysten/sui': patch
---

Normalize gRPC transport errors in `SuiGrpcClient`: percent-encoded `grpc-message` status text is
now decoded once at the wire boundary, so `client.core`, the generated service clients and any
caller-supplied interceptors all see readable messages instead of `Object%20not%20found%3A%200x1`.
A call aborted by an `AbortSignal.timeout` is now coded `DEADLINE_EXCEEDED` rather than `INTERNAL`.
`SuiGrpcClient` also forwards the remaining `GrpcWebOptions` (`fetch`, `format`, `meta`, `timeout`,
`interceptors`, `jsonOptions`, `binaryOptions`) to the transport it builds; previously only
`baseUrl` and `fetchInit` were passed through and the rest were silently ignored.
