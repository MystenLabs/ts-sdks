---
'@mysten/deepbook-v3': minor
---

Add `predict.cost`: client-side all-in trade cost for Predict, with no chain call. `cost.mintCost`
returns the exact debit a mint makes (premium plus the trading, builder, congestion and
inventory-impact fees, net of any sponsor subsidy), `cost.mintCostForBudget` sizes a lot-rounded fill
whose all-in cost fits a budget — the `expiry_market::mint_exact_cost` lot search, run locally — and
`cost.redeemLiveProceeds` returns what closing a live position credits. The fee components
(`tradingFee`, `builderFee`, `feeIncentiveSubsidy`, `congestionPenaltyRate`, `mintInventoryImpact`,
`closeInventoryImpact`, `expiryFeeMultiplier`, `bernoulliFeeRate`) and the order-ID helpers
(`decodeOrderRange`, `orderStrikes`) are exported alongside. The arithmetic is an exact integer port
of the deployed fee path: matching every execution input yields the same raw amounts.
Invalid unsigned inputs are rejected, and enabled inventory impact requires book data.
Budget sizing preserves the contract's best-effort maximum-payout fallback, which can miss a larger
admissible fill or reject a quantity floor that another fill could meet.
`exactProbabilities` identifies raw probability inputs, without certifying their source or state
freshness. These helpers provide local previews; `read.quoteMint` / `read.quoteRedeem` simulate
the actual transaction against account and market state before submission.

Update Testnet Predict/Sessions to v2 and preserve `predictV1` / `sessionsPackageIdV1` for existing
structs, events and dynamic-field keys. Generate call targets and type origins from Published.toml
alongside the initial deployment manifest; Mainnet remains v1. Add `tx.mintCost`,
`read.quoteMintCost`, `SessionsContract.mintExactCost` and regenerated v2 Move bindings.
