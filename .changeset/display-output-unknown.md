---
'@mysten/sui': minor
'@mysten/kiosk': patch
---

Update `Display.output` type from `Record<string, string>` to `Record<string, unknown>` to match actual API behavior. Display v2 templates can produce structured JSON values (objects, arrays) for fields that reference non-string Move types or use the `:json` transform. This affects the core client type, the JSON-RPC `DisplayFieldsResponse` type, and all three transport implementations (gRPC, GraphQL, JSON-RPC).
