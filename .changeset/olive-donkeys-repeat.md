---
'@mysten/deepbook-v3': minor
---

Target the `deepbook-predict-testnet` deployment. Every testnet id the SDK ships changes — the
Predict, account and sessions packages and their shared objects — so `getConfig('testnet')`,
`getAccountConfig('testnet')`, `getSessionsConfig('testnet')` and `TESTNET_CONFIG` all resolve
against the new deployment, and `getDeployment('testnet')` reports it by name and source commit.
Anything pinned to the previous testnet deployment's ids will not find its accounts, positions or
markets there; they are separate deployments, not an upgrade.

The settlement collateral is renamed upstream from `dusdc::dusdc::DUSDC` to `usdc::usdc::USDC`, so
one Move module path resolves on both testnet and mainnet and mainnet can link native USDC by
address alone. `quoteCoinType` carries the new type. The testnet coin keeps the `DUSDC` display
symbol, which is what distinguishes the mintable test coin from native USDC in wallets and
explorers — read `quoteCoinType` rather than assuming a symbol or a type.

The exported surface is otherwise unchanged: no symbol is added, removed or re-typed, and the
renamed Move argument (`min_usdc_out`) is internal to the transaction builders.
