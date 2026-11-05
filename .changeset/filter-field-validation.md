---
'@mysten/sui': patch
---

`listTransactions`, `listEvents` and the ledger streams reject a filter field that isn't a string
(such as `sender` or `function`) with a clear "Invalid … filter" error instead of a `TypeError`.
The ledger streams throw every invalid filter, including a malformed address, as a `SuiStreamError`
with code `InvalidOptions` before making a request, on both transports.
