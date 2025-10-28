# @mysten/walrus

## 0.8.2

### Patch Changes

- Updated dependencies [89fa2dc]
  - @mysten/bcs@1.9.2
  - @mysten/sui@1.43.2

## 0.8.1

### Patch Changes

- Updated dependencies [a37829f]
  - @mysten/bcs@1.9.1
  - @mysten/sui@1.43.1

## 0.8.0

### Minor Changes

- 8894443: Set \_walrusBlobType for quilts
- f3b19a7: Use bcs.byteVector and bcs.bytes instead of bcs.vector(bcs.u8()) and bcs.fixedArrray(n,
  bcs.u8()) to improve performance
- bf9f85c: deprecate asClientExtension methods

### Patch Changes

- Updated dependencies [f3b19a7]
- Updated dependencies [f3b19a7]
- Updated dependencies [bf9f85c]
  - @mysten/sui@1.43.0
  - @mysten/bcs@1.9.0

## 0.7.5

### Patch Changes

- Updated dependencies [98c8a27]
  - @mysten/sui@1.42.0

## 0.7.4

### Patch Changes

- Updated dependencies [a17c337]
- Updated dependencies [d554cd2]
- Updated dependencies [04fcfbc]
  - @mysten/bcs@1.8.1
  - @mysten/sui@1.41.0

## 0.7.3

### Patch Changes

- Updated dependencies [f5fc0c0]
  - @mysten/sui@1.40.0

## 0.7.2

### Patch Changes

- Updated dependencies [a9f9035]
  - @mysten/sui@1.39.1

## 0.7.1

### Patch Changes

- Updated dependencies [ca92487]
- Updated dependencies [5ab3c0a]
  - @mysten/sui@1.39.0

## 0.7.0

### Minor Changes

- ea1ac70: Update dependencies and improve support for typescript 5.9

### Patch Changes

- Updated dependencies [3c1741f]
- Updated dependencies [ea1ac70]
  - @mysten/sui@1.38.0
  - @mysten/utils@0.2.0
  - @mysten/bcs@1.8.0

## 0.6.7

### Patch Changes

- ab94098: Fix bug that resulted in invalid blobs for quilts with large indexes

## 0.6.6

### Patch Changes

- 78bd0e9: Update codegen arg normalization for object args
- Updated dependencies [c689b98]
- Updated dependencies [5b9ff1a]
  - @mysten/sui@1.37.6

## 0.6.5

### Patch Changes

- Updated dependencies [3980d04]
  - @mysten/sui@1.37.5

## 0.6.4

### Patch Changes

- Updated dependencies [6b03e57]
  - @mysten/sui@1.37.4

## 0.6.3

### Patch Changes

- Updated dependencies [8ff1471]
  - @mysten/sui@1.37.3

## 0.6.2

### Patch Changes

- Updated dependencies [660377c]
  - @mysten/sui@1.37.2

## 0.6.1

### Patch Changes

- Updated dependencies [b456936]
  - @mysten/walrus-wasm@0.1.1

## 0.6.0

### Minor Changes

- b2ee297: Add retries for BlobNotRegistered errors
- 22d727d: Update contracts and remove subsidy contract (which has been integrated into the main
  contract)

## 0.5.3

### Patch Changes

- 33230ed: update walrus contract calls to use named arguments
- Updated dependencies [33230ed]
- Updated dependencies [33230ed]
- Updated dependencies [33230ed]
  - @mysten/bcs@1.7.0
  - @mysten/sui@1.37.1

## 0.5.2

### Patch Changes

- fa1c76a: fix parsing of linear tip config

## 0.5.1

### Patch Changes

- e4650d6: Fix handling of upload relays that do not require a tip
- Updated dependencies [72168f0]
  - @mysten/sui@1.37.0

## 0.5.0

### Minor Changes

- 3fd7e41: Move delete, epochs and owner options from writeFilesFlow to flow.register

## 0.4.0

### Minor Changes

- 2473630: Add writeFilesFlow method to client

### Patch Changes

- Updated dependencies [44354ab]
  - @mysten/sui@1.36.2

## 0.3.1

### Patch Changes

- Updated dependencies [c76ddc5]
  - @mysten/sui@1.36.1

## 0.3.0

### Minor Changes

- 0d5cd85: rename fanout proxy to upload relay

## 0.2.3

### Patch Changes

- 3bbbbf1: Fix linear tip calculation

## 0.2.2

### Patch Changes

- 1c4a82d: update links in package.json
- 274c5eb: Update linear tipconfig shape
- 470e3a7: Update codegen args' normalization
- Updated dependencies [1c4a82d]
- Updated dependencies [783bb9e]
- Updated dependencies [783bb9e]
- Updated dependencies [5cbbb21]
  - @mysten/utils@0.1.1
  - @mysten/bcs@1.6.4
  - @mysten/sui@1.36.0

## 0.2.1

### Patch Changes

- 888afe6: update codegen
- 4ee5185: Update codegen
- Updated dependencies [888afe6]
  - @mysten/sui@1.35.0

## 0.2.0

### Minor Changes

- c0560fe: Use update codegen for move contracts
- 1e537a8: Add support for fanOut proxy

### Patch Changes

- Updated dependencies [1e537a8]
- Updated dependencies [3fb7a83]
  - @mysten/walrus-wasm@0.1.0
  - @mysten/sui@1.34.0

## 0.1.8

### Patch Changes

- Updated dependencies [a00522b]
- Updated dependencies [a00522b]
  - @mysten/sui@1.33.0
  - @mysten/utils@0.1.0
  - @mysten/bcs@1.6.3

## 0.1.7

### Patch Changes

- Updated dependencies [6b7deb8]
  - @mysten/sui@1.32.0

## 0.1.6

### Patch Changes

- Updated dependencies [1ff4e57]
- Updated dependencies [550e2e3]
- Updated dependencies [550e2e3]
  - @mysten/sui@1.31.0

## 0.1.5

### Patch Changes

- Updated dependencies [5bd6ca3]
  - @mysten/sui@1.30.5

## 0.1.4

### Patch Changes

- Updated dependencies [5dce590]
- Updated dependencies [4a5aef6]
  - @mysten/sui@1.30.4

## 0.1.3

### Patch Changes

- bb7c03a: Update dependencies
- Updated dependencies [4457f10]
- Updated dependencies [bb7c03a]
  - @mysten/sui@1.30.3
  - @mysten/utils@0.0.1
  - @mysten/bcs@1.6.2

## 0.1.2

### Patch Changes

- Updated dependencies [b265f7e]
  - @mysten/sui@1.30.2

## 0.1.1

### Patch Changes

- Updated dependencies [ec519fc]
  - @mysten/sui@1.30.1

## 0.1.0

### Minor Changes

- 2f7d83c: Add `computeBlobMetadata` method to the client which can be used to pre-compute the ID
  and other metadata given a set of bytes

### Patch Changes

- 9617ab9: Fix subsidies contract id after upgrade
- Updated dependencies [2456052]
- Updated dependencies [5264038]
- Updated dependencies [2456052]
- Updated dependencies [2456052]
- Updated dependencies [2456052]
- Updated dependencies [2456052]
  - @mysten/sui@1.30.0

## 0.0.21

### Patch Changes

- Updated dependencies [7e1c525]
  - @mysten/bcs@1.6.1
  - @mysten/sui@1.29.1

## 0.0.20

### Patch Changes

- 90033a0: Add tx digest to error messages
- 7d66a32: Use async thunks to improve transaction construction
- Updated dependencies [7d66a32]
- Updated dependencies [eb91fba]
- Updated dependencies [19a8045]
  - @mysten/sui@1.29.0

## 0.0.19

### Patch Changes

- Updated dependencies [9a94aea]
  - @mysten/sui@1.28.2

## 0.0.18

### Patch Changes

- Updated dependencies [3cd4e53]
  - @mysten/sui@1.28.1

## 0.0.17

### Patch Changes

- Updated dependencies [2705dc8]
  - @mysten/sui@1.28.0

## 0.0.16

### Patch Changes

- 981a39d: Add separate esm entrypoint
- Updated dependencies [981a39d]
  - @mysten/walrus-wasm@0.0.6

## 0.0.15

### Patch Changes

- 986c4e3: Add onError to storageNodeClientOptions
- Updated dependencies [5cea435]
  - @mysten/sui@1.27.1

## 0.0.14

### Patch Changes

- 4d13ef8: Implement experimental client extension support
- Updated dependencies [4d13ef8]
- Updated dependencies [4d13ef8]
  - @mysten/sui@1.27.0

## 0.0.13

### Patch Changes

- 4389b36: Add support for customizing wasm url
- Updated dependencies [4389b36]
  - @mysten/walrus-wasm@0.0.5

## 0.0.12

### Patch Changes

- 3be4016: fix packageId in deleteBlob move call

## 0.0.11

### Patch Changes

- 4425284: Fix certify_blob transaction

## 0.0.10

### Patch Changes

- a83d4a5: update readme

## 0.0.9

### Patch Changes

- 7ba32a4: update dependencies
- 7ba32a4: update testnet contract ids
- Updated dependencies [7ba32a4]
- Updated dependencies [c3a788c]
  - @mysten/sui@1.26.1
  - @mysten/bcs@1.6.0

## 0.0.8

### Patch Changes

- Updated dependencies [3e9bb8d]
  - @mysten/walrus-wasm@0.0.4

## 0.0.7

### Patch Changes

- ea2ce74: Add missing wasm bindings
- Updated dependencies [ea2ce74]
  - @mysten/walrus-wasm@0.0.3

## 0.0.6

### Patch Changes

- 7d6e114: Fix walrus wasm bindings not working in bundled client applications
- Updated dependencies [7d6e114]
  - @mysten/walrus-wasm@0.0.2

## 0.0.5

### Patch Changes

- Updated dependencies [906dd14]
  - @mysten/sui@1.26.0

## 0.0.4

### Patch Changes

- 833e007: Add mainnet package ids
- 833e007: Add support for subsidies

## 0.0.3

### Patch Changes

- Updated dependencies [e8b5d04]
  - @mysten/sui@1.25.0

## 0.0.2

### Patch Changes

- e6c72c1: Fix testnet bcs mismatch

## 0.0.1

### Patch Changes

- f81d84d: initial release
- Updated dependencies [cf3d12d]
- Updated dependencies [f81d84d]
  - @mysten/sui@1.24.0
  - @mysten/walrus-wasm@0.0.1
