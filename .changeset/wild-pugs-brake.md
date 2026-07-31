---
'@mysten/deepbook-predict': patch
---

Add `@mysten/deepbook-predict`, the TypeScript SDK for DeepBook Predict (European cash-settled range digitals). The `PredictClient` facade offers transaction builders (trade, PLP, account, builder codes), chain-only reads including market discovery, quotes, and position enumeration, and typed execution-receipt decoders — all built on `sui-ts-codegen`-generated contract bindings, with Move aborts surfaced as typed errors via clever-error decoding. Targets the live testnet deployment (`predict-testnet-7-29`); `getConfig('mainnet')` throws until Predict is deployed to mainnet.
