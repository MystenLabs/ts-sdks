---
'@mysten/sui': minor
---

Add `SuiGrpcRequestError` and `GrpcStatusCode` for structured gRPC error handling.

Previously, gRPC object fetch errors were returned as a plain `Error` with only
the message string, discarding the `code` and `details` fields from the
`google.rpc.Status` response. This made it impossible to programmatically
distinguish NOT_FOUND from PERMISSION_DENIED or INVALID_ARGUMENT.

`SuiGrpcRequestError` extends `SuiClientError` (and therefore `Error`), preserving
backwards compatibility with existing `instanceof Error` checks while exposing
the full status envelope. `GrpcStatusCode` provides named constants for common
gRPC status codes.

`SuiClientError` is now re-exported from the `@mysten/sui/client` entry point,
giving consumers a stable public import path and making `instanceof SuiClientError`
usable as a single catch-all for any SDK error regardless of transport.
