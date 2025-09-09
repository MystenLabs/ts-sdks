# @mysten/ledgerjs-hw-app-sui

## 0.6.0

### Minor Changes

- ea1ac70: Update dependencies and improve support for typescript 5.9

## 0.5.2

### Patch Changes

- 1c4a82d: update links in package.json

## 0.5.1

### Patch Changes

- bb7c03a: Update dependencies

## 0.5.0

### Minor Changes

- 156ae13: Remove option to pass `txn` as a hexadecimal string or Buffer
- 156ae13: Add `options` parameter to the `signTransaction` method for clear signing displays

### Patch Changes

- 7ba32a4: update dependencies

## 0.4.2

### Patch Changes

- 7abd243: Update repo links

## 0.4.1

### Patch Changes

- 0f27a97: Update dependencies

## 0.4.0

### Minor Changes

- a92b03de42: The Typescript SDK has been renamed to `@mysten/sui` and includes many new features
  and breaking changes. See the
  [full migration guide](https://sdk.mystenlabs.com/typescript/migrations/sui-1.0) for details on
  how to upgrade.

## 0.3.1

### Patch Changes

- 4830361fa4: Updated typescript version

## 0.3.0

### Minor Changes

- e5f9e3ba21: Replace tsup based build to fix issues with esm/cjs dual publishing

## 0.2.0

### Minor Changes

- 29a29756d: Added "displayOnDevice" option to getPublicKey and cleaned-up some library code

## 0.1.0

### Minor Changes

- a6690ac7d: Changed the default behavior of `publish` to publish an upgreadeable-by-sender package
  instead of immutable.
- 0a7b42a6d: This changes almost all occurences of "delegate", "delegation" (and various
  capitalizations/forms) to their equivalent "stake"-based name. Function names, function argument
  names, RPC endpoints, Move functions, and object fields have been updated with this new naming
  convention.
- 3709957cf: Published initial version of library
