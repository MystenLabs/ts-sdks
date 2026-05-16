# @mysten/webcrypto-signer

## 0.1.2

### Patch Changes

- f7de3e5: Restore docs in published tarballs.
- Updated dependencies [f7de3e5]
  - @mysten/sui@2.16.2

## 0.1.1

### Patch Changes

- 9e067cf: Validate the new per-package release flow end-to-end across every public @mysten package.
  No functional changes — empty patch bump to force the orchestrator to dispatch every
  release-<pkg>.yml workflow with `dry_run=false` so each package publishes via OIDC trusted
  publishing.
- Updated dependencies [9e067cf]
  - @mysten/sui@2.16.1

## 0.1.0

### Minor Changes

- 75a32c1: Initial release. Sui signer using the Web Crypto API (P-256 / Secp256r1), previously
  available via `@mysten/signers/webcrypto`.
