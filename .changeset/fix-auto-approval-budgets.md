---
'@mysten/wallet-sdk': patch
---

Fix `AutoApprovalManager` budget and policy checks: the shared budget now covers the combined value of every coin type a transaction spends, spends that need a shared budget are rejected when none is configured, empty coin budgets count as zero, policy object types are normalized before matching, and `applyTransactionEffects` rejects results whose digest doesn't match the analysis.
