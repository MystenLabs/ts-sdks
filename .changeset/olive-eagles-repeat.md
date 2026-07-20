---
'@mysten/deepbook-v3': minor
---

Sync with deepbook_margin v6 and latest DeepBook core.

Margin (live on mainnet at `0x8af25e44`):

- `poolProxy.placeMarketOrderAndRepayLoan`, `poolProxy.placeReduceOnlyLimitOrderAndRepayLoan`,
  `poolProxy.placeReduceOnlyMarketOrderAndRepayLoan` — repay the loan from the fill proceeds before
  the risk check, so the gate is the net post-repay `risk_ratio` rather than the borrow floor.
- `marginTPSL.executeConditionalOrdersV3` — deleveraging conditional execution, letting a stop-loss
  fire in the `liquidation..min_borrow` band. `executeConditionalOrders` (v2) is unchanged.
- `marginAdmin.setMinOpenRiskRatio` and `getMinOpenRiskRatio` — the position-opening risk floor,
  distinct from the borrow floor.

Core — `deepBook.placePostOnlyLimitOrder`, `bestBidPrice`, `bestAskPrice`. These require a DeepBook
core package newer than mainnet v8 / testnet v20 and are not yet callable on either network.

Package IDs updated to match `Published.toml`: mainnet margin v5 → v6, testnet core v17 → v20,
testnet margin → v14. Testnet `MARGIN_V1` (used to build `MarginApp` type tags) pointed at an
abandoned package lineage and is corrected to the real original ID `0xb8620c24…`.

Regenerated `src/contracts` bindings from deepbookv3 main.
