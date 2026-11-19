---
'@mysten/sui': patch
---

`parseTransactionBcs` returns `SuiClientTypes.TransactionData` and decodes every transaction kind.
`parseTransactionDataBcs` is a deprecated alias of it, and `parseTransactionBcs(bytes, true)` is
deprecated in favor of `Transaction.fromKind(bytes).getData()`.
