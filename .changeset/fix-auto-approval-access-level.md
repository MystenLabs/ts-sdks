---
'@mysten/wallet-sdk': patch
---

Fix `AutoApprovalManager` owned-object permission checks, which compared access levels in reverse: a `read` or `mutate` permission no longer approves transactions that mutate or transfer the object, and higher permissions now cover lower access.
