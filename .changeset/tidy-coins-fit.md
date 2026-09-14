---
'@mysten/sui': patch
---

Bound automatic gas coin selection in the JSON-RPC transaction resolver by the gas payment limit and remaining input object headroom, accounting for address balance reservations and referenced packages. Select as many eligible coins as fit in server order, fetching additional pages only when needed to fill the available slots.
