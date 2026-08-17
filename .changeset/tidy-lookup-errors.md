---
'@mysten/sui': minor
---

Add transport-neutral `ObjectError` and `TransactionError` lookup details across the Core API clients.
The existing transport-specific `ObjectError.code` field and `(code, message)` constructor remain
supported; the transport-neutral `reason`, resource identity, and `cause` fields are additive.
