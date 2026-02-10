# @mysten/payment-kit

## 0.1.1

### Patch Changes

- 99d1e00: Add default export condition
- Updated dependencies [99d1e00]
  - @mysten/bcs@2.0.2
  - @mysten/sui@2.3.2

## 0.1.0

### Minor Changes

- e00788c: Update to use SuiJsonRpcClient instead of SuiClient

  Updated all type signatures, internal usages, examples, and documentation to use
  `SuiJsonRpcClient` from `@mysten/sui/jsonRpc` instead of the deprecated `SuiClient` from
  `@mysten/sui/client`.

### Patch Changes

- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
- Updated dependencies [e00788c]
  - @mysten/sui@2.0.0
  - @mysten/bcs@2.0.0

## 0.0.20

### Patch Changes

- c6d4b1b: Added `sourceCoin` transaction result chaining so a pre-computed object can be used to
  fulfill a payment request

## 0.0.19

### Patch Changes

- Updated dependencies [29e8b92]
  - @mysten/sui@1.45.2

## 0.0.18

### Patch Changes

- Updated dependencies [e3811f1]
  - @mysten/sui@1.45.1

## 0.0.17

### Patch Changes

- Updated dependencies [88bdbac]
  - @mysten/sui@1.45.0

## 0.0.16

### Patch Changes

- c87d668: Write receiverAddress instead of amount for receiver when creating a payment uri

## 0.0.15

### Patch Changes

- be1336a: Resolved an issue where valid addresses were being flagged as invalid

## 0.0.14

### Patch Changes

- ef45c9a: Updated Payment Kit URI Standard

## 0.0.13

### Patch Changes

- Updated dependencies [44d9b4f]
  - @mysten/sui@1.44.0

## 0.0.12

### Patch Changes

- c185b9d: Added Payment Kit URI helper methods to create and parse valid uris

## 0.0.11

### Patch Changes

- Updated dependencies [89fa2dc]
  - @mysten/bcs@1.9.2
  - @mysten/sui@1.43.2

## 0.0.10

### Patch Changes

- 4e537fd: Removed the need to pass an empty object `{}` when calling `paymentKit`

## 0.0.9

### Patch Changes

- Updated dependencies [a37829f]
  - @mysten/bcs@1.9.1
  - @mysten/sui@1.43.1

## 0.0.8

### Patch Changes

- bc6c9f9: Replaced asClientExtension() with paymentKit()

## 0.0.7

### Patch Changes

- 3ba4bd9: - `getRegistryIdFromName` is now an exposed method on `PaymentKitClient`
  - `registryName` is now an optional parameter if `registryId` is not provided. If `registryName`
    is `undefined` than the default registry name is used.
- Updated dependencies [f3b19a7]
- Updated dependencies [f3b19a7]
- Updated dependencies [bf9f85c]
  - @mysten/sui@1.43.0
  - @mysten/bcs@1.9.0

## 0.0.6

### Patch Changes

- Updated dependencies [98c8a27]
  - @mysten/sui@1.42.0

## 0.0.5

### Patch Changes

- Updated dependencies [a17c337]
- Updated dependencies [d554cd2]
- Updated dependencies [04fcfbc]
  - @mysten/bcs@1.8.1
  - @mysten/sui@1.41.0

## 0.0.4

### Patch Changes

- da06c0c: Added Registry and Payment Record calls
- Updated dependencies [f5fc0c0]
  - @mysten/sui@1.40.0

## 0.0.3

### Patch Changes

- bde81dd: Added processRegistryPayment/processEphemeralPayment transaction builders and
  getPaymentRecord
- Updated dependencies [a9f9035]
  - @mysten/sui@1.39.1

## 0.0.2

### Patch Changes

- Updated dependencies [ca92487]
- Updated dependencies [5ab3c0a]
  - @mysten/sui@1.39.0
