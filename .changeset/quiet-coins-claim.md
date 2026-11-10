---
'@mysten/zksend': minor
---

Deposit claimed and reclaimed coins into the recipient's address balance instead of transferring coin objects. Continue transferring NFTs as objects and allow address balance deposits in `isClaimTransaction`. Require a zkBag claim lifecycle and verify that transferred or deposited objects come from preceding claim calls.
