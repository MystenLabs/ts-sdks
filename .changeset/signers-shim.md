---
'@mysten/signers': patch
---

Internal refactor: each backend now lives in its own package (`@mysten/aws-kms-signer`, `@mysten/gcp-kms-signer`, `@mysten/ledger-signer`, `@mysten/webcrypto-signer`). The `@mysten/signers/{aws,gcp,ledger,webcrypto}` subpaths now re-export from the new packages — no public API change. To shrink your dependency tree, switch to importing from the per-backend package directly.
