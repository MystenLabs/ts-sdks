---
'@mysten/sui': minor
---

`GrpcWebFetchTransport` exported from `@mysten/sui/grpc` is now a subclass of the
`@protobuf-ts/grpcweb-transport` class of the same name, with the two error defects that transport
has as of 2.11.1 repaired, and `SuiGrpcClient` builds one by default. Percent-encoded `grpc-message`
status text is decoded at the wire boundary, so `client.core`, the generated service clients and any
interceptors all see readable messages instead of `Object%20not%20found%3A%200x1`; and a call cut
short by its own signal is coded `DEADLINE_EXCEEDED` for an `AbortSignal.timeout` or `CANCELLED` for
any other abort reason, rather than `INTERNAL`. A transport supplied by the caller is used exactly
as given, so build custom grpc-web transports from this class.

`SuiGrpcClient` also forwards the remaining `GrpcWebOptions` (`fetch`, `format`, `meta`, `timeout`,
`interceptors`, `jsonOptions`, `binaryOptions`) to the transport it builds; previously only
`baseUrl` and `fetchInit` were passed through and the rest were silently ignored.
