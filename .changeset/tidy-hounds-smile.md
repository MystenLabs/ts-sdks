---
'@mysten/sui': minor
---

Add `SuiGrpcWebTransport`, a `GrpcWebFetchTransport` with the two error defects of
`@protobuf-ts/grpcweb-transport` 2.11.1 repaired, and build one by default in `SuiGrpcClient`.
Percent-encoded `grpc-message` status text is decoded at the wire boundary, so `client.core`, the
generated service clients and any interceptors all see readable messages instead of
`Object%20not%20found%3A%200x1`; and a call cut short by its own signal is coded `DEADLINE_EXCEEDED`
for an `AbortSignal.timeout` or `CANCELLED` for any other abort reason, rather than `INTERNAL`.
Construct it directly (and pass it as `transport`) when you need transport options the client does
not take. A transport supplied by the caller is used exactly as given.

`SuiGrpcClient` also forwards the remaining `GrpcWebOptions` (`fetch`, `format`, `meta`, `timeout`,
`interceptors`, `jsonOptions`, `binaryOptions`) to the transport it builds; previously only
`baseUrl` and `fetchInit` were passed through and the rest were silently ignored.
