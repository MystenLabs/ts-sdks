---
'@mysten/hashi': patch
---

`view.depositStatus` reports `confirmed` only when the deposit request is missing from the requests bag; other lookup failures now throw instead of being reported as `confirmed`.
