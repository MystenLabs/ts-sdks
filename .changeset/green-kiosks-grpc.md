---
'@mysten/kiosk': minor
'@mysten/sui': patch
---

Add support for `SuiGrpcClient` and other `ClientWithCoreApi` implementations to the Kiosk SDK, and
query objects and all transfer policy event pages through the shared Core API.

Preserve JSON-RPC Display rendering errors when mapping object responses to the Core API.
