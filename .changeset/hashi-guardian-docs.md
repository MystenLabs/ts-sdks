---
'@mysten/hashi': patch
---

Correct the guardian docs: the README's limiter example reads the on-chain `guardian_url` instead of a retired devnet hostname, `GovernanceConfig.guardianPublicKey` is deprecated because hashi no longer has that config, and `RawGuardianInfo.gitRevision` is documented as `''` until the operator initializes the guardian.
