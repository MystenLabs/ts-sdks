---
'@mysten/deepbook-predict': patch
---

Add `@mysten/deepbook-predict`, the TypeScript SDK for DeepBook Predict (European cash-settled range digitals). Provides composable per-entrypoint transaction builders (trade, PLP, account, builder codes), chain-only reads including market discovery, quotes, and position enumeration, typed execution-receipt decoders, and typed Move aborts, behind a curated `PredictClient` facade. Targets the live testnet deployment; `getConfig('mainnet')` throws until Predict is deployed to mainnet.
