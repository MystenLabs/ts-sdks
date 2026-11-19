---
'@mysten/sui': major
---

The gRPC-web transport, whether built by `SuiGrpcClient` or constructed as `GrpcWebFetchTransport`
from `@mysten/sui/grpc`:

- uses the smaller binary wire format by default instead of base64 text. Pass `format: 'text'` for
  proxies that only support the text format.
- reports network failures (fetch `TypeError`s, from a failed request or a failed response body
  read) as `UNAVAILABLE` instead of `INTERNAL`.
- rejects a `baseUrl` that is neither an absolute http(s) URL nor a path starting with `/` when it is
  constructed.
