---
'@mysten/sui': minor
---

`GrpcWebFetchTransport` exported from `@mysten/sui/grpc` is now a subclass of the
`@protobuf-ts/grpcweb-transport` class of the same name, repairing three defects that transport has
as of 2.11.1, and `SuiGrpcClient` builds one by default:

- Percent-encoded `grpc-message` status text is decoded at the wire boundary, so `client.core`, the
  generated service clients and any interceptors all see readable messages rather than
  `Object%20not%20found:%200x1`.
- A call cut short by its own signal is coded `DEADLINE_EXCEEDED` for an `AbortSignal.timeout` or
  `CANCELLED` for any other abort reason, rather than `INTERNAL`.
- `timeout` is enforced as a client-side deadline instead of only being advertised in the
  `grpc-timeout` header, so a stalled connection fails as `DEADLINE_EXCEEDED` rather than hanging.
  No deadline is applied unless one is asked for.

A transport supplied by the caller is used exactly as given, so build custom grpc-web transports
from this class.

`SuiGrpcClient` also forwards the remaining `GrpcWebOptions` (`fetch`, `format`, `meta`, `timeout`,
`interceptors`, `jsonOptions`, `binaryOptions`) to the transport it builds; previously only
`baseUrl` and `fetchInit` were passed through and the rest were silently ignored.
