---
'@mysten/deepbook-v3': minor
---

Point the Testnet Predict config at Predict v7, the admin-managed cadence table upgrade, and add its
bindings: `registryMoveCalls.addCadence`, `registryMoveCalls.cadencePeriods` and
`registryMoveCalls.createAndShareExpiryMarketAt`, plus the `configEvents.CadenceAdded` event. The
Propbook bindings gain the SVI model reads and setter (`sviModel`, `setBlockScholesSviModel`,
`BlockScholesSVIModelSet`). Mainnet is unchanged, and Mainnet v4 has none of these functions yet.
