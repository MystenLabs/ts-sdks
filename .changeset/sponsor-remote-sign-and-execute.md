---
'@mysten-incubation/sponsor': minor
---

`createSponsor`'s `signer` can be a `RemoteSigner` (`toSuiAddress` and `signAndExecuteTransaction`), for sponsors whose key lives in another service. Validators still run first, and `signAndExecuteTransaction` returns the same results. A sponsor with a remote signer can't sign without executing, so its `signTransaction` throws.
