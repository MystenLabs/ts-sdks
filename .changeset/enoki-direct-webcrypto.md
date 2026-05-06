---
'@mysten/enoki': patch
---

Switched the WebCrypto signer import to `@mysten/webcrypto-signer` (instead of `@mysten/signers/webcrypto`). No public API change. Enoki no longer depends on the larger `@mysten/signers` package, dropping the GCP KMS and Ledger HW transitive dependencies.
