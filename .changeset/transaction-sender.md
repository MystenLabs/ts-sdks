---
'@mysten/sui': minor
---

Add `sender` to `SuiClientTypes.Transaction` on every client, without needing `include.transaction`. System transactions report `0x0`. `parseGrpcTransactionResponse` now needs `transaction.sender` in the read mask; the new `transactionReadMaskPaths` export returns the paths it needs for an `include`.
