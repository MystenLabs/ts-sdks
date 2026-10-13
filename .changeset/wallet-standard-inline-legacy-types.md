---
'@mysten/wallet-standard': patch
---

Define the response types used by the deprecated `sui:signAndExecuteTransactionBlock` feature
locally instead of importing them from `@mysten/sui/jsonRpc`, which has been removed. The feature's
input and output shapes are unchanged.
