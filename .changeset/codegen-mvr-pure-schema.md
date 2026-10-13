---
'@mysten/codegen': patch
'@mysten/create-dapp': patch
---

The generated `getPureBcsSchema` helper no longer passes non-hex package addresses (such as MVR
names like `@org/pkg`) to `normalizeSuiAddress`, which throws on non-hex input as of `@mysten/sui`
3.0. Such types are treated as non-pure, as before.

The `react-e2e-counter` template in `@mysten/create-dapp` carries the same updated helper.
