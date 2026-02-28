# @mysten/dapp-kit-core

## 1.1.1

### Patch Changes

- 3dde32f: Fix crash when a connected wallet is unregistered and re-registered (e.g. during HMR).
  The `$connection` store now gracefully returns a disconnected state instead of throwing, and
  storage is preserved on disconnect so autoconnect can reconnect after re-registration.

## 1.1.0

### Minor Changes

- 7011028: feat: export react context and account signer
- ded6fd2: Expose a styleable "trigger" part for more custom styling needs on the connect button

### Patch Changes

- Updated dependencies [9ab9a50]
- Updated dependencies [1c97aa2]
  - @mysten/sui@2.5.0
  - @mysten/wallet-standard@0.20.1

## 1.0.4

### Patch Changes

- 99d1e00: Add default export condition
- Updated dependencies [99d1e00]
  - @mysten/wallet-standard@0.20.1
  - @mysten/slush-wallet@1.0.2
  - @mysten/utils@0.3.1
  - @mysten/sui@2.3.2

## 1.0.3

### Patch Changes

- c0a4d9c: Fix autoconnect not triggering when wallets register before store subscription by using
  subscribe instead of listen

## 1.0.2

### Patch Changes

- Updated dependencies [339d1e0]
  - @mysten/utils@0.3.0
  - @mysten/slush-wallet@1.0.1
  - @mysten/sui@2.0.1
  - @mysten/wallet-standard@0.20.0

## 1.0.1

### Patch Changes

- 86a0e0f: Add READMEs for dapp-kit-core and dapp-kit-react packages.

## 1.0.0

### Major Changes

- e00788c: Initial release

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
  - @mysten/wallet-standard@0.20.0
  - @mysten/slush-wallet@1.0.0
