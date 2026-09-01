# @mysten/webcrypto-signer

## 0.2.21

## 0.2.20

## 0.2.19

## 0.2.18

### Patch Changes

- f2f7048: Upgrade workspace dependencies, remove the legacy dapp-kit package, and migrate the
  remaining consumers to the current gRPC-based dapp-kit. Remove the legacy API reference while
  retaining the migration guide and deprecation notice.

## 0.2.17

## 0.2.16

## 0.2.15

## 0.2.14

## 0.2.13

## 0.2.12

## 0.2.11

## 0.2.10

## 0.2.9

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
