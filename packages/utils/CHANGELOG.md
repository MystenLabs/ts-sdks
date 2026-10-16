# @mysten/utils

## 0.4.2

### Patch Changes

- 3aa65e2: Speed up BCS parsing and serialization: faster ULEB, integer and byte reads and writes,
  enum and option encoding, string decoding, and a single input conversion per write for transformed
  types. Base58, base64 and hex helpers in `@mysten/utils` are faster and no longer depend on
  `@scure/base`. Sui address and object digest encoding is faster.

  Behaviour changes:

  - `BcsReader.readBytes` and `readULEB` throw instead of reading past the end of a view into the
    rest of its buffer.
  - `bcs.option(T)` returns `null`/`undefined` when `T` reads as `null`/`undefined` (for example a
    nested option's inner `None`), instead of `true`.
  - `bcs.Address.serializedSize` and `bcs.ObjectDigest.serializedSize` throw on invalid input
    instead of returning a size.

## 0.4.1

### Patch Changes

- f2f7048: Upgrade workspace dependencies, remove the legacy dapp-kit package, and migrate the
  remaining consumers to the current gRPC-based dapp-kit. Remove the legacy API reference while
  retaining the migration guide and deprecation notice.

## 0.4.0

### Minor Changes

- bbf63cb: Updated dependencies

## 0.3.3

### Patch Changes

- f7de3e5: Restore docs in published tarballs.

## 0.3.2

### Patch Changes

- 9e067cf: Validate the new per-package release flow end-to-end across every public @mysten package.
  No functional changes — empty patch bump to force the orchestrator to dispatch every
  release-<pkg>.yml workflow with `dry_run=false` so each package publishes via OIDC trusted
  publishing.

## 0.3.1

### Patch Changes

- 99d1e00: Add default export condition

## 0.3.0

### Minor Changes

- 339d1e0: Add mitt

## 0.2.0

### Minor Changes

- ea1ac70: Update dependencies and improve support for typescript 5.9

## 0.1.1

### Patch Changes

- 1c4a82d: update links in package.json

## 0.1.0

### Minor Changes

- a00522b: Add dataloader

## 0.0.1

### Patch Changes

- bb7c03a: Update dependencies
