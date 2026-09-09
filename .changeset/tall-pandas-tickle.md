---
'@mysten/deepbook-v3': minor
---

Add Mainnet deployment ids for Predict, sessions and the account primitive. `getConfig`,
`getAccountConfig`, `getSessionsConfig`, `getUnits` and `getDeployment` now resolve `'mainnet'`
instead of throwing, and `MAINNET_CONFIG` / `MAINNET_DEPLOYMENT` / `MAINNET_UNITS` are exported
alongside their testnet counterparts. `DeployedNetwork` widens to `'testnet' | 'mainnet'`.

Mainnet settles in Circle's native USDC
(`0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7::usdc::USDC`). The in-repo
test currency is never published to Mainnet, so the collateral type resolves to Circle's package
there and to the DeepBook test coin on Testnet — read `quoteCoinType` from the config rather than
assuming either.

The ids are generated from the deploy tooling's own Mainnet manifest, like Testnet's, so both
networks move together on a redeploy and cannot drift apart across subpaths.
