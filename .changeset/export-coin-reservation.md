---
'@mysten/sui': minor
---

Export `isCoinReservationDigest` from `@mysten/sui/utils`, so services that look up gas payment objects can recognise the placeholder ref an address-balance payment adds to `gasData.payment`.
