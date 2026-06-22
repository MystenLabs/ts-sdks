---
'@mysten/enoki': patch
---

`EnokiKeypair` now extends the shared `ZkLoginSigner` from `@mysten/sui/zklogin`, removing duplicated
signature-wrapping logic. `signTransaction` / `signPersonalMessage` / `getPublicKey` are unchanged.
Two behaviors are corrected to match `ZkLoginSigner`: `getKeyScheme()` now returns `'ZkLogin'`
(previously the ephemeral key's scheme), and `sign()` now throws instead of returning a bare
ephemeral signature (which was never valid for the zkLogin address).
