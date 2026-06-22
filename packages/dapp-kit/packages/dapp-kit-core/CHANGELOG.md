# @mysten/dapp-kit-core

## 1.6.2

## 1.6.1

## 1.6.0

### Minor Changes

- 0c3eec4: Report `isReconnecting` during the initial auto-connect session restore.

  Previously, restoring a persisted session on page load jumped the connection straight from
  `disconnected` to `connected`, so for the entire async restore window the connection looked
  identical to a logged-out user (`account: null`, `isConnecting: false`, `isReconnecting: false`,
  `status: "disconnected"`). Consumers had no way to tell "restoring a saved session" apart from
  "logged out", which caused auth gates to incorrectly redirect logged-in users on hard refresh.

  Auto-connect now eagerly enters the `reconnecting` state on mount whenever a persisted session
  exists — independent of wallet-registration timing, so the window is covered even before the saved
  wallet registers (default wallets such as Slush register asynchronously). It stays `reconnecting`
  until both every configured wallet initializer has settled and a short grace period has elapsed
  (to absorb late-registering wallets such as browser extensions, which have no deterministic
  "registered" signal), then settles to `disconnected` if the saved session still hasn't restored —
  while never interrupting an in-flight restore, so a slow-but-valid wallet always wins, and
  continuing to listen so a very-late wallet can still restore. The `reconnecting` state also now
  reports `isReconnecting: true` while the target wallet/account is still resolving, instead of
  being suppressed to `disconnected`.

  Adds an `autoConnectTimeout` option (default `5000` ms) to tune that grace period.

  Consumers can rely on `isReconnecting` to distinguish restoring from logged-out, e.g.
  `if (!isReconnecting && !account) redirect()`.

## 1.5.0

### Minor Changes

- 8a03101: Allow `signTransaction`, `signAndExecuteTransaction`, and `signPersonalMessage` to take
  optional `account` and `network` overrides.

  - `account` (a `UiWalletAccount` belonging to the connected wallet) signs with a specific account
    without changing the globally selected account via `switchAccount`. Throws
    `WalletAccountNotFoundError` if the account does not belong to the connected wallet.
  - `network` signs/executes against a specific configured network without changing the active
    network via `switchNetwork`, which is useful for apps that operate on multiple networks (for
    example mainnet and testnet) at once. The chain is derived from the network and the transaction
    is built against that network's client. Throws `ChainNotSupportedError` if the signing account
    does not support the requested network.

  Both default to the currently connected account and active network, so existing call sites are
  unaffected.

## 1.4.0

### Minor Changes

- bbf63cb: Updated dependencies

### Patch Changes

- Updated dependencies [bbf63cb]
  - @mysten/slush-wallet@1.1.0
  - @mysten/utils@0.4.0
  - @mysten/wallet-standard@0.21.0

## 1.3.2

### Patch Changes

- f7de3e5: Restore docs in published tarballs.
- Updated dependencies [f7de3e5]
  - @mysten/slush-wallet@1.0.5
  - @mysten/sui@2.16.2
  - @mysten/utils@0.3.3
  - @mysten/wallet-standard@0.20.3

## 1.3.1

### Patch Changes

- 9e067cf: Validate the new per-package release flow end-to-end across every public @mysten package.
  No functional changes — empty patch bump to force the orchestrator to dispatch every
  release-<pkg>.yml workflow with `dry_run=false` so each package publishes via OIDC trusted
  publishing.
- Updated dependencies [9e067cf]
  - @mysten/slush-wallet@1.0.4
  - @mysten/sui@2.16.1
  - @mysten/utils@0.3.2
  - @mysten/wallet-standard@0.20.2

## 1.3.0

### Minor Changes

- 875b1b7: Add customizable cursor CSS tokens for interactive elements. New CSS custom properties
  `--cursor-button`, `--cursor-menu-item`, `--cursor-radio`, and `--cursor-disabled` allow consumers
  to override the default cursor style on buttons, wallet list items, radio inputs, and disabled
  elements.

### Patch Changes

- Updated dependencies [43b2670]
- Updated dependencies [ef0b8a7]
  - @mysten/sui@2.15.0
  - @mysten/wallet-standard@0.20.1

## 1.2.2

### Patch Changes

- 220c140: Fix selected account not persisting to storage on account switch, causing the first
  account to be restored on page refresh.
- Updated dependencies [3324a93]
  - @mysten/sui@2.13.3
  - @mysten/wallet-standard@0.20.1

## 1.2.1

### Patch Changes

- a085d92: Gracefully handle non-compliant wallet extensions that provide undefined values for
  required Wallet Standard fields like `accounts`, preventing an uncaught TypeError from crashing
  the app.
- Updated dependencies [bfeff69]
  - @mysten/sui@2.12.0
  - @mysten/wallet-standard@0.20.1

## 1.2.0

### Minor Changes

- a7237ff: Export `WalletInitializer` type from the public API

### Patch Changes

- 43e69f8: Add embedded LLM-friendly docs to published packages
- Updated dependencies [43e69f8]
- Updated dependencies [e51dc5d]
  - @mysten/slush-wallet@1.0.3
  - @mysten/sui@2.8.0
  - @mysten/wallet-standard@0.20.1

## 1.1.4

### Patch Changes

- 637b125: Clear persisted wallet session on explicit disconnect to prevent auto-reconnect after
  page refresh. Wallet removal (HMR, React strict mode) is unaffected.
- Updated dependencies [903eecc]
- Updated dependencies [e33fea3]
- Updated dependencies [903eecc]
- Updated dependencies [e33fea3]
- Updated dependencies [903eecc]
- Updated dependencies [903eecc]
  - @mysten/sui@2.6.0
  - @mysten/wallet-standard@0.20.1

## 1.1.3

### Patch Changes

- 49e3f86: Fix connected account menu dropdown positioning in Shadow DOM by removing conflicting
  `autoPlacement()` middleware.
- Updated dependencies [e8f985e]
  - @mysten/sui@2.5.1
  - @mysten/wallet-standard@0.20.1

## 1.1.2

### Patch Changes

- c75ff80: Fix autoconnect crash when computed store value is undefined during subscribe

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
