# @mysten/move-bytecode-template

## 0.4.0

### Minor Changes

- bbf63cb: Updated dependencies

## 0.3.2

### Patch Changes

- f7de3e5: Restore docs in published tarballs.

## 0.3.1

### Patch Changes

- 9e067cf: Validate the new per-package release flow end-to-end across every public @mysten package.
  No functional changes — empty patch bump to force the orchestrator to dispatch every
  release-<pkg>.yml workflow with `dry_run=false` so each package publishes via OIDC trusted
  publishing.

## 0.3.0

### Minor Changes

- ea1ac70: Update dependencies and improve support for typescript 5.9

## 0.2.1

### Patch Changes

- b456936: Fix package exports

## 0.2.0

### Minor Changes

- 1a51c9c: Update wasm build to build for both web and nodejs
