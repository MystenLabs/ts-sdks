---
'@mysten/sui': patch
---

Limit automatic gas selection in the JSON-RPC transaction resolver to 256 payment entries, including any address-balance reservation. Preserve the existing single-page coin fetch and its default limit, then truncate the filtered coins without enforcing a combined transaction input limit.
