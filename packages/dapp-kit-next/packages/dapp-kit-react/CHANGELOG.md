# @mysten/dapp-kit-react

## 2.0.0

### Major Changes

- 2b8355b: Move `ConnectButton` and `ConnectModal` to a new `@mysten/dapp-kit-react/ui` subpath
  export to avoid loading the `@webcomponents/scoped-custom-element-registry` polyfill when only
  using hooks and providers.

  **Breaking change:** Update imports from:

  ```ts
  import { ConnectButton, ConnectModal } from '@mysten/dapp-kit-react';
  ```

  to:

  ```ts
  import { ConnectButton, ConnectModal } from '@mysten/dapp-kit-react/ui';
  ```

### Patch Changes

- Updated dependencies [3dde32f]
  - @mysten/dapp-kit-core@1.1.1

## 1.1.0

### Minor Changes

- 7011028: feat: export react context and account signer

### Patch Changes

- Updated dependencies [7011028]
- Updated dependencies [ded6fd2]
  - @mysten/dapp-kit-core@1.1.0

## 1.0.2

### Patch Changes

- 99d1e00: Add default export condition
- Updated dependencies [99d1e00]
  - @mysten/dapp-kit-core@1.0.4

## 1.0.1

### Patch Changes

- 86a0e0f: Add READMEs for dapp-kit-core and dapp-kit-react packages.
- Updated dependencies [86a0e0f]
  - @mysten/dapp-kit-core@1.0.1

## 1.0.0

### Major Changes

- e00788c: Initial release

### Patch Changes

- Updated dependencies [e00788c]
  - @mysten/dapp-kit-core@1.0.0
