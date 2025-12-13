---
'@mysten/dapp-kit': minor
'@mysten/kiosk': minor
'@mysten/deepbook-v3': minor
'@mysten/suins': minor
'@mysten/walrus': minor
'@mysten/zksend': minor
'@mysten/codegen': minor
'@mysten/enoki': minor
'@mysten/payment-kit': minor
'@mysten/seal': minor
'@mysten/signers': minor
'@mysten/wallet-sdk': minor
---

Update to use SuiJsonRpcClient instead of SuiClient

Updated all type signatures, internal usages, examples, and documentation to use `SuiJsonRpcClient` from `@mysten/sui/jsonRpc` instead of the deprecated `SuiClient` from `@mysten/sui/client`.
