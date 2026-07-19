# @mysten/ledger-signer

## 0.2.8

## 0.2.7

## 0.2.6

## 0.2.5

## 0.2.4

## 0.2.3

## 0.2.2

## 0.2.1

## 0.2.0

### Minor Changes

- bbf63cb: Updated dependencies

### Patch Changes

- Updated dependencies [bbf63cb]
  - @mysten/ledgerjs-hw-app-sui@0.9.0

## 0.1.2

### Patch Changes

- f7de3e5: Restore docs in published tarballs.
- Updated dependencies [f7de3e5]
  - @mysten/ledgerjs-hw-app-sui@0.8.3
  - @mysten/sui@2.16.2

## 0.1.1

### Patch Changes

- 9e067cf: Validate the new per-package release flow end-to-end across every public @mysten package.
  No functional changes — empty patch bump to force the orchestrator to dispatch every
  release-<pkg>.yml workflow with `dry_run=false` so each package publishes via OIDC trusted
  publishing.
- Updated dependencies [9e067cf]
  - @mysten/ledgerjs-hw-app-sui@0.8.2
  - @mysten/sui@2.16.1

## 0.1.0

### Minor Changes

- 75a32c1: Initial release. Sui signer for Ledger hardware wallets, previously available via
  `@mysten/signers/ledger`.
