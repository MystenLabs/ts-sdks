---
'@mysten/sui': patch
---

Remove `enable_coin_reservation_obj_refs` feature flag check from core resolver. Coin reservation refs are now created whenever address balance is non-zero, removing the need for the `getProtocolConfig` call during transaction building.
