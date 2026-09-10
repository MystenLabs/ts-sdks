---
'@mysten/deepbook-v3': patch
---

Predict docs: document both recorded deployments. `PREDICT.md` and the README now describe the
`deepbook-predict-mainnet` and `deepbook-predict-testnet` records that `getConfig`, `getDeployment`,
`getUnits`, `getAccountConfig`, and `getSessionsConfig` resolve, the quote coin per network (Circle
native USDC on mainnet, a mintable test coin that displays as DUSDC on testnet, read from
`quoteCoinType`), the `side: 'range'` descriptor arm, which decoders have plural forms, what is
exported for PTB composition, that `read.markets()` returns live-and-not-yet-settled markets, and
the `supplyPlp` / `withdrawPlp` floor options as shipped. Documentation only; no runtime change.
