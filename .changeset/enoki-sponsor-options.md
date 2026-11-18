---
'@mysten/enoki': minor
---

Add `client.enoki.getSponsorOptions()`, which returns the `address` and `signAndExecute` options for the sponsor SDK's `createSponsor`, so a sponsor built with it uses Enoki. Transactions Enoki declines are returned as `Rejected`.
