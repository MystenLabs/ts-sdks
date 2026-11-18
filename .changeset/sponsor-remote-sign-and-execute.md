---
'@mysten-incubation/sponsor': minor
---

`createSponsor` accepts an `address` and a `signAndExecute` function in place of a `signer`, for sponsors whose key lives in another service. Validators still run first, and `signAndExecuteTransaction` returns the same results. A sponsor created this way can't sign without executing, so its `signTransaction` throws. It leaves the gas-owner check to the remote service.
