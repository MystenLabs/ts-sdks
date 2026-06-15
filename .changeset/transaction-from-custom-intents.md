---
'@mysten/sui': minor
---

`Transaction.from` now accepts an optional `intentResolvers` option, a map of intent names to resolvers. This lets you synchronously copy a transaction that still contains unresolved custom intents without first awaiting `prepareForSerialization`. Built-in intents (such as `CoinWithBalance`) continue to be handled automatically.
