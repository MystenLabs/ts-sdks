---
'@mysten/sui': patch
---

Fix `parseStructTag` to reject malformed inputs: empty address/module/name components (e.g. `::foo::Bar`) and trailing content after type parameters (e.g. `Coin<u8>GARBAGE`).
