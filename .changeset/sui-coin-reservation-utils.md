---
'@mysten/sui': minor
---

Export `xorCoinReservationObjectId` and `parseAccumulatorFieldCoinType` from `@mysten/sui/utils`. The former is the XOR operation that sits between a coin reservation ref's masked object id and the underlying accumulator-field object id — self-inverse, so the same function masks and unmasks. The latter parses a `Field<Key<Balance<T>>, U128>` struct tag and returns the normalized `T` (the coin type), which is how a reservation ref's coin type is recovered at read time.
