---
'@mysten/sui': minor
---

Export `unmaskCoinReservationObjectId` and `parseAccumulatorFieldCoinType` from `@mysten/sui/utils`. The former is the inverse of the existing internal mask operation — XOR a reservation ref's masked object ID with the chain identifier to recover the underlying accumulator-field object ID. The latter parses a `Field<Key<Balance<T>>, U128>` struct tag and returns the normalized `T` (the coin type), which is how a reservation ref's coin type is recovered at read time.
