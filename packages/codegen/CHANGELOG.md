# @mysten/codegen

## 0.2.5

### Patch Changes

- Updated dependencies [72168f0]
  - @mysten/sui@1.37.0

## 0.2.4

### Patch Changes

- Updated dependencies [44354ab]
  - @mysten/sui@1.36.2

## 0.2.3

### Patch Changes

- Updated dependencies [c76ddc5]
  - @mysten/sui@1.36.1

## 0.2.2

### Patch Changes

- 319e234: Update arg fields' naming when an std arg is featured

## 0.2.1

### Patch Changes

- 1c4a82d: update links in package.json
- 470e3a7: Update codegen args' normalization
- Updated dependencies [1c4a82d]
- Updated dependencies [783bb9e]
- Updated dependencies [783bb9e]
- Updated dependencies [5cbbb21]
  - @mysten/bcs@1.6.4
  - @mysten/sui@1.36.0

## 0.2.0

### Minor Changes

- 4ee5185: remove init function for generated modules. package addresses are now passed into move
  calls or resolved via mvr
- 4ee5185: Filter out well-known objects from move calls (clock, random, system, denyList)
- 4ee5185: Allow move arguments to be passed as objects

### Patch Changes

- 888afe6: Fix falsy args
- 4ee5185: Add argument interfaces for move calls
- Updated dependencies [888afe6]
  - @mysten/sui@1.35.0

## 0.1.0

### Minor Changes

- f3f2a08: Add support for config files and update cli to use positional args for packages to allow
  for easier globbing

## 0.0.1

### Patch Changes

- c0560fe: Fix check for context arg
- c0560fe: remove support for generating from bytecode
- Updated dependencies [3fb7a83]
  - @mysten/sui@1.34.0
