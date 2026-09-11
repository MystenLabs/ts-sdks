---
'@mysten/hashi': patch
---

Fix deposits and withdrawals aborting with `EVersionDisabled` after the Hashi package is upgraded.
Hashi Move calls now target the latest enabled package, read from the Hashi object's upgrade cap
when the transaction is serialized. `packageId` stays the original package, so coin, object and
event types are unchanged.
