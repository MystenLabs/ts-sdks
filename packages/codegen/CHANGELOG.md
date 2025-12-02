# @mysten/codegen

## 0.5.12

### Patch Changes

- Updated dependencies [29e8b92]
  - @mysten/sui@1.45.2

## 0.5.11

### Patch Changes

- Updated dependencies [e3811f1]
  - @mysten/sui@1.45.1

## 0.5.10

### Patch Changes

- baf3a35: Fix hasFunctions() to respect privateMethods configuration

  This change fixes a bug where modules with only entry functions (no types or public functions)
  were not being generated even when privateMethods was set to 'entry'. The hasFunctions() method
  now checks the #includedFunctions set instead of only looking for public functions, ensuring
  consistency with the privateMethods option added in version 0.5.0.

- Updated dependencies [88bdbac]
  - @mysten/sui@1.45.0

## 0.5.9

### Patch Changes

- Updated dependencies [44d9b4f]
  - @mysten/sui@1.44.0

## 0.5.8

### Patch Changes

- Updated dependencies [89fa2dc]
  - @mysten/bcs@1.9.2
  - @mysten/sui@1.43.2

## 0.5.7

### Patch Changes

- Updated dependencies [a37829f]
  - @mysten/bcs@1.9.1
  - @mysten/sui@1.43.1

## 0.5.6

### Patch Changes

- Updated dependencies [f3b19a7]
- Updated dependencies [f3b19a7]
- Updated dependencies [bf9f85c]
  - @mysten/sui@1.43.0
  - @mysten/bcs@1.9.0

## 0.5.5

### Patch Changes

- Updated dependencies [98c8a27]
  - @mysten/sui@1.42.0

## 0.5.4

### Patch Changes

- Updated dependencies [a17c337]
- Updated dependencies [d554cd2]
- Updated dependencies [04fcfbc]
  - @mysten/bcs@1.8.1
  - @mysten/sui@1.41.0

## 0.5.3

### Patch Changes

- Updated dependencies [f5fc0c0]
  - @mysten/sui@1.40.0

## 0.5.2

### Patch Changes

- Updated dependencies [a9f9035]
  - @mysten/sui@1.39.1

## 0.5.1

### Patch Changes

- 24e6b36: Optional struct generation should be bcs.option instead of bcs.vector
- Updated dependencies [ca92487]
- Updated dependencies [5ab3c0a]
  - @mysten/sui@1.39.0

## 0.5.0

### Minor Changes

- 223d075: Add option to codegen private functions which defaults to generating only private entry
  functions
- ea1ac70: Update dependencies and improve support for typescript 5.9

### Patch Changes

- Updated dependencies [3c1741f]
- Updated dependencies [ea1ac70]
  - @mysten/sui@1.38.0
  - @mysten/bcs@1.8.0

## 0.4.5

### Patch Changes

- 78bd0e9: Update codegen arg normalization for object args
- Updated dependencies [c689b98]
- Updated dependencies [5b9ff1a]
  - @mysten/sui@1.37.6

## 0.4.4

### Patch Changes

- Updated dependencies [3980d04]
  - @mysten/sui@1.37.5

## 0.4.3

### Patch Changes

- Updated dependencies [6b03e57]
  - @mysten/sui@1.37.4

## 0.4.2

### Patch Changes

- Updated dependencies [8ff1471]
  - @mysten/sui@1.37.3

## 0.4.1

### Patch Changes

- Updated dependencies [660377c]
  - @mysten/sui@1.37.2

## 0.4.0

### Minor Changes

- 22d727d: Execute `sui move summary` when generating code

## 0.3.0

### Minor Changes

- 33230ed: Add typenames to exported bcs types
- 33230ed: Export non-generic BCS types directly rather than wrapping with a function
- 33230ed: Use new MoveStruct, MoveEnum, and MoveTuple classes for bcs types

### Patch Changes

- Updated dependencies [33230ed]
- Updated dependencies [33230ed]
- Updated dependencies [33230ed]
  - @mysten/bcs@1.7.0
  - @mysten/sui@1.37.1

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
