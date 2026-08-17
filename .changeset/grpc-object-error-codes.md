---
'@mysten/sui': patch
---

Use stable gRPC status names (for example `'NOT_FOUND'`, `'INTERNAL'`) as the `ObjectError.code` for
gRPC object lookup errors instead of the raw status number (`'5'`), mapping unrecognized statuses to
`'unknown'`. Codes are fixed, human-readable identifiers; use the transport-neutral `reason` field to
detect missing objects across transports.
