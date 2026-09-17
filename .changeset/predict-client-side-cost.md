---
'@mysten/deepbook-v3': minor
---

Add `predict.cost`: client-side all-in trade cost for Predict, with no chain call. `cost.mintCost`
returns the exact debit a mint makes (premium plus the trading, builder, congestion and
inventory-impact fees, net of any sponsor subsidy), `cost.mintCostForBudget` sizes the largest fill
whose all-in cost fits a budget — the `expiry_market::mint_exact_cost` lot search, run locally — and
`cost.redeemLiveProceeds` returns what closing a live position credits. The fee components
(`tradingFee`, `builderFee`, `feeIncentiveSubsidy`, `congestionPenaltyRate`, `mintInventoryImpact`,
`closeInventoryImpact`, `expiryFeeMultiplier`, `bernoulliFeeRate`) and the order-ID helpers
(`decodeOrderRange`, `orderStrikes`) are exported alongside. The arithmetic is an exact integer port
of the deployed fee path, so given chain-sourced probabilities the quote matches the chain to the
raw unit; `read.quoteMint` / `read.quoteRedeem` remain the authoritative dry-run quotes.
