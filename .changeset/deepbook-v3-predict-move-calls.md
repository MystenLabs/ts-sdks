---
'@mysten/deepbook-v3': minor
---

Predict: export the generated move-call bindings from `@mysten/deepbook-v3/predict`, the way
`/account` already exports `accountMoveCalls`. Each `client.predict.tx.*` builder returns a finished
`Transaction`, so a Predict call could not join a PTB the caller was building — creating an account,
funding it and queueing a PLP supply in one transaction meant hand-writing `plp::request_supply` as a
raw `moveCall`. Every Predict module with a callable function is now reachable as a namespace of
transaction thunks (`plpMoveCalls`, `expiryMarketMoveCalls`, `predictAccountMoveCalls`,
`protocolConfigMoveCalls`, `registryMoveCalls`, `builderCodeMoveCalls`, `marketManagerMoveCalls`,
`pricingMoveCalls`, `rangeCodecMoveCalls`, and the cap modules), alongside the event layouts
(`vaultEvents`, `orderEvents`, `configEvents`, `builderCodeEvents`). Pass
`config: toGeneratedConfig(cfg)` and the shared objects fill themselves in; owner-authorized calls
take an `Auth` from `generateAuth(cfg)`. Additive only: no existing export changes.
