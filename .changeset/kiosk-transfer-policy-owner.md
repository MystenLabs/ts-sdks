---
'@mysten/kiosk': patch
---

Type `TransferPolicy.owner` as `SuiClientTypes.ObjectOwner` from `@mysten/sui/client` instead of the
removed JSON-RPC `ObjectOwner` type. The runtime value is unchanged.
