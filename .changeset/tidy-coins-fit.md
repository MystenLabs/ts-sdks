---
'@mysten/sui': patch
---

Bound automatic gas coin selection in the JSON-RPC transaction resolver by the gas payment limit and remaining input object headroom, accounting for address balance reservations and referenced packages. Preserve the existing single-page coin fetch and its default limit, then filter and truncate the returned coins in server order to fit the available slots.
