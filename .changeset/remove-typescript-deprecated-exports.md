---
'@mysten/sui': major
---

Remove deprecated exports and properties:

- Removed `fromB64`, `toB64`, `fromHEX`, `toHEX` exports from utils (use `fromBase64`, `toBase64`, `fromHex`, `toHex` instead)
- Removed `schema` property from `ParsedKeypair` (use `scheme` instead)
- Removed `requestType` parameter from `executeTransactionBlock`
- Removed deprecated faucet methods: `requestSuiFromFaucetV0`, `requestSuiFromFaucetV1`, `getFaucetRequestStatus` (use `requestSuiFromFaucetV2` instead)
- Removed deprecated subscription methods: `subscribeEvent`, `subscribeTransaction`
- Removed `blockData` property from Transaction class (use `getData()` instead)
- Removed `gasConfig` property from TransactionDataBuilder (use `gasData` instead)
- Removed `NamedPackagesPluginCache` type export (use `NamedPackagesOverrides` instead)
- Removed unnamed plugin registration methods from Transaction class
