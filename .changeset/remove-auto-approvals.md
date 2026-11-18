---
'@mysten/wallet-sdk': minor
---

Remove the auto-approval APIs (`AutoApprovalManager`, `autoApprovalAnalyzer`, `operationType`, `extractOperationType`, `OPERATION_INTENT` and the auto-approval policy, settings and state schemas and types). They now live in `@mysten-incubation/auto-approvals`. The transaction analyzer is unchanged.
