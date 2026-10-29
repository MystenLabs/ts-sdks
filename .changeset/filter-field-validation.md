---
'@mysten/sui': patch
---

`listTransactions`, `listEvents` and the ledger streams reject a filter field that isn't a string
(such as `sender` or `function`) with a clear "Invalid … filter" error instead of a `TypeError`.
