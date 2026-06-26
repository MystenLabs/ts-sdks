---
'@mysten/sui': patch
---

Fix `CoinWithBalance` intent failing to build after a `toJSON`/`Transaction.from` round-trip.
Serializing a transaction with `CoinWithBalance` as a supported intent turns the intent's
`balance` into a string, which was not coerced back to a `bigint` on deserialization, causing
`ValiError: Invalid type: Expected bigint` when building the restored transaction.
