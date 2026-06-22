---
'@mysten/sui': minor
---

Add `ZkLoginSigner`, a transport- and provider-agnostic zkLogin signer. It wraps any ephemeral
`Signer` and transforms its signatures into zkLogin signatures using the supplied proof `inputs` and
`maxEpoch`: `new ZkLoginSigner({ ephemeralSigner, maxEpoch, inputs, legacyAddress })`. The address is
derived from the proof; `legacyAddress` is a required boolean (consistent with `jwtToAddress`,
`toZkLoginPublicIdentifier`, and the other zkLogin address APIs). Optionally pass `address` to
validate the derived address (throws on mismatch) and `client` to make the derived public key able to
verify signatures. Like other composite signers (e.g. `MultiSigSigner`), calling `sign()` directly
throws — use `signTransaction` / `signPersonalMessage`.

Also adds a read-only `legacyAddress` getter to `ZkLoginPublicIdentifier`.
