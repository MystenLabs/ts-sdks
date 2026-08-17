---
'@mysten/sui': patch
---

Restore backwards-compatible `ObjectError.code` values for gRPC object lookups. Missing objects now
report the long-standing `notExists` code (instead of the raw gRPC status number `'5'` introduced in
2.26.0), so handlers written against earlier releases keep working on every transport. Other gRPC
statuses use the status name (for example `'INTERNAL'`) as the code, and unrecognized statuses map to
`'unknown'`. The transport-neutral `reason` field is unchanged and remains the preferred way to
detect missing objects.
