---
'@mysten/sui': minor
---

Add `assumeSufficientAddressBalances` build option to resolve `tx.coin()` and `tx.balance()` from
address balance without a client. On a full build that needs no other resolution, doesn't use
`tx.gas`, and already has a `ValidDuring` or `Validity` expiration, it also sets an unset gas payment
to `[]`
