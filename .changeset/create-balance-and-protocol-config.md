---
'@mysten/sui': minor
---

Add `tx.coin()` and `tx.balance()` methods and rewrite CoinWithBalance intent resolution.

- `tx.coin({ type, balance })` — produces a `Coin<T>` of the requested balance, sourced from owned coins and gas
- `tx.balance({ type, balance })` — produces a `Balance<T>` of the requested balance, sourced from address balance or owned coins
- When balance intents are used, the merged pool remainder is converted to Balance and returned to the sender's address balance via `send_funds`
- Multiple intents of the same coin type are now resolved with a single combined `SplitCoins` instead of per-intent splits
