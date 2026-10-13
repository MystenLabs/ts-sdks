---
'@mysten/kiosk': patch
---

Type `TransferPolicy.owner` as `SuiClientTypes.ObjectOwner` from `@mysten/sui/client`. The value has
always come from the core API (with a `$kind` discriminator), but was typed as the JSON-RPC
`ObjectOwner` shape, which was removed from `@mysten/sui`. This is a type-accuracy fix: the runtime
value is unchanged.
