---
'@mysten/hashi': patch
---

Detect missing objects via the transport-neutral `ObjectError.reason` (`'notFound'`) introduced in
`@mysten/sui`, restoring `findUsedUtxos`, deposit status, and withdrawal status behavior on the gRPC
transport. The legacy JSON-RPC code and gRPC message checks remain as fallbacks for older
`@mysten/sui` versions.
