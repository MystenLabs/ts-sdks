---
'@mysten/dapp-kit-core': patch
---

Decode the transaction data in wallet responses with `parseTransactionDataBcs`, so results include
the transaction `kind`.
