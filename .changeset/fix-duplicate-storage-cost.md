---
'@mysten/sui': patch
---

Fix duplicate `storageCost` in `ParallelTransactionExecutor` gas calculation, which was double-counting storage costs.
