---
'@mysten/sui': minor
---

`SuiGrpcClient` now creates its gRPC-web transport with the binary wire format by default, which
removes the base64 overhead (about a third of the bytes on the wire) of the text format. Pass
`format: 'text'` for proxies that only support base64 gRPC-web framing.
