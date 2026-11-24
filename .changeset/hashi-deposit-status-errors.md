---
'@mysten/hashi': patch
---

`view.depositStatus` no longer reports a deposit as confirmed when the requests-bag lookup fails for a reason other than the entry being missing. Network and server errors now propagate.
