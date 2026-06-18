---
'@mysten/wallet-sdk': minor
---

The `transactionResponse` analyzer is now a generic factory — call `transactionResponse()` (was a
bare analyzer value) — so its result can be typed to exactly the simulate fields you request.
`transactionResponse<{ balanceChanges: true }>()` returns the same shared, deduped analyzer instance
retyped so `result.balanceChanges` is present, and makes `include` a required request-scoped option
when it names a field that must be fetched. `effects` is always included and can't be turned off.
This is a breaking change: update `transactionResponse` references to `transactionResponse()` (or
`transactionResponse<Include>()`). The `balanceChanges` analyzer now requests `balanceChanges` from
the dry-run, so its result is the real `BalanceChange[]` rather than always empty.
