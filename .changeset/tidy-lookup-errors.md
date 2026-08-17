---
'@mysten/sui': minor
---

Add transport-neutral `ObjectError` and `TransactionError` lookup details across the Core API clients.
The existing transport-specific `ObjectError.code` field and `(code, message)` constructor remain
supported but are deprecated in favor of the explicit `reason` field and options constructor.
