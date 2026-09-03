---
'@mysten/sui': minor
---

Add `assumeSufficientAddressBalances` build option to resolve `tx.coin()` and `tx.balance()` from
address balance without a client, and to pay gas from address balance when the gas coin isn't used
