---
'@mysten/sui': minor
---

Export coin-reservation helpers from `@mysten/sui/utils`:

- `isCoinReservationDigest(digest)` — detect the `0xac` magic bytes on a reservation ref digest.
- `parseCoinReservationBalance(digest)` — decode the reserved balance from the digest.
- `xorCoinReservationObjectId(objectId, chainIdentifier)` — toggle between a reservation ref's masked object id and the underlying accumulator-field object id. Self-inverse; the same function masks and unmasks.
- `parseAccumulatorFieldCoinType(typeString)` — given an accumulator-field object's `Field<Key<Balance<T>>, U128>` struct tag, return the normalized coin type `T`. Used together with `xorCoinReservationObjectId` + `getObjects` to recover the coin type backing a reservation ref.
