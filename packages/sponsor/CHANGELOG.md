# @mysten-incubation/sponsor

## 0.1.0

### Minor Changes

- 564c8e7: `Sponsor.signAndExecuteTransaction` now threads through every core `executeTransaction`
  prop (`signal`, etc.) and accepts a generic `include`, combined with the always-on `effects` so
  the result type reflects exactly what was requested. The dry-run that backs validation can
  likewise be extended: a validator declares the simulate `include` fields it needs (e.g.
  `include: { balanceChanges: true }`) and that requirement surfaces, typed, on `validationOptions`
  — `effects` stays forced on in both paths and can't be turned off.

### Patch Changes

- Updated dependencies [564c8e7]
  - @mysten/wallet-sdk@0.6.0

## 0.0.2

## 0.0.1

### Patch Changes

- Updated dependencies [cc5cb98]
- Updated dependencies [cc5cb98]
- Updated dependencies [cc5cb98]
  - @mysten/wallet-sdk@0.5.0
