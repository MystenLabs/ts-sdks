---
'@mysten/sui': minor
---

Add `gasPaymentMocked` to `simulateTransaction` results, which is `true` when the node simulated with a mocked gas coin because the transaction had no gas payment, and export `MOCKED_GAS_OBJECT_ID` from `@mysten/sui/utils`
