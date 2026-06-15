# @mysten/window-wallet-core

## 0.2.0

### Minor Changes

- bbf63cb: Updated dependencies

### Patch Changes

- Updated dependencies [bbf63cb]
  - @mysten/utils@0.4.0

## 0.1.6

### Patch Changes

- f7de3e5: Restore docs in published tarballs.
- Updated dependencies [f7de3e5]
  - @mysten/utils@0.3.3

## 0.1.5

### Patch Changes

- 9e067cf: Validate the new per-package release flow end-to-end across every public @mysten package.
  No functional changes — empty patch bump to force the orchestrator to dispatch every
  release-<pkg>.yml workflow with `dry_run=false` so each package publishes via OIDC trusted
  publishing.
- Updated dependencies [9e067cf]
  - @mysten/utils@0.3.2

## 0.1.4

### Patch Changes

- a7237ff: Add optional `label` field to JWT session account schema and include rejection reason in
  post-message channel error messages

## 0.1.3

### Patch Changes

- 99d1e00: Add default export condition
- Updated dependencies [99d1e00]
  - @mysten/utils@0.3.1

## 0.1.2

### Patch Changes

- Updated dependencies [339d1e0]
  - @mysten/utils@0.3.0

## 0.1.1

### Patch Changes

- e3811f1: update valibot

## 0.1.0

### Minor Changes

- ea1ac70: Update dependencies and improve support for typescript 5.9

### Patch Changes

- 45efc26: add config option to use an existing window instead of opening a new one
- Updated dependencies [ea1ac70]
  - @mysten/utils@0.2.0

## 0.0.6

### Patch Changes

- 1c4a82d: update links in package.json
- Updated dependencies [1c4a82d]
  - @mysten/utils@0.1.1

## 0.0.5

### Patch Changes

- Updated dependencies [a00522b]
  - @mysten/utils@0.1.0

## 0.0.4

### Patch Changes

- bb7c03a: Update dependencies
- Updated dependencies [bb7c03a]
  - @mysten/utils@0.0.1

## 0.0.3

### Patch Changes

- a257600: improve verifyJwtSession
  - remove opener origin check as it's not possible to access it
  - add extra CryptoKey type to verifyJwtSession secretKey

- 933199c: verifyJwtSession remove opener check

## 0.0.2

### Patch Changes

- 3eb8990: package initialization
