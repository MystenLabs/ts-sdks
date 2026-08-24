---
'@mysten/deepbook-predict': minor
---

Re-pin to the `predict-testnet-8-21` deployment (sourceCommit `1f79fe87`), which carries every Predict change on `main` plus the deployment-hardening commits. Regenerated the Move bindings and transcribed the new package/object ids.

Breaking, following the contracts:

- **Leverage is removed from the protocol.** `MintOptions.leverage`, `MintAmountOptions.leverage`, `MintReceipt.leverage`, and the `leverageToRaw` unit helper are gone; the deployed `mint_exact_quantity` / `mint_exact_amount` entrypoints no longer take a leverage argument.
- **Liquidation is removed** (it existed only to close leveraged positions). `RedeemReceipt.liquidated` and `RedeemQuote.wouldLiquidate` are gone, along with the `LiquidatedOrderRedeemed` decoding path.
- **`MintReceipt.netPremium` is now `premium`** (`raw.netPremium` → `raw.premium`), matching the renamed event field.
- **New fee components surface on receipts**: `MintReceipt.fees.referral` and `.inventoryImpact` (referrers are now paid from mint fees; inventory impact is charged path-independently), and `RedeemReceipt.fees.inventoryImpactRebate`.
- **A settled claim closes the order in full.** `tx.claimSettled(owner, market, { orderId })` no longer takes a `quantity` — the deployed `redeem_settled` has no quantity argument — and `ClaimReceipt` drops `quantityClosed` / `settlementPrice`, which the settled event no longer emits (it reports `payout` only).
- **Numeric mint strikes must sit on the market's coarser admission grid.** `read.markets()` / `read.market()` now report `admissionTickSize` (`$100` against a `$0.01` tick on the current testnet deployment), and an off-grid strike throws `PredictInputError` at build time instead of aborting on chain with `EInvalidAdmissionTick`. The market's `referencePrice` remains admissible off-grid.
- `read.quoteMint`'s `cost` now includes the inventory-impact charge, and `decode.redeem` / `read.quoteRedeem` account for the inventory-impact rebate, matching the deployed all-in cost and payout exactly.

Value-semantics changes — these move NUMBERS, not just types, so re-check any code that pins them:

- **`MintQuote.cost` / `raw.cost` now include the inventory-impact charge**, matching the deployed `all_in_cost`. The value is larger than in the previous release. The README tells integrators to pass `cost` as `maxCost`; the old value now under-budgets and the chain rejects it with `EMintCostAboveMax`.
- **`RedeemReceipt.proceeds` / `raw.proceeds` (and `RedeemQuote.proceeds`) now add the inventory-impact rebate**, matching what `settle_live_redeem_payment` actually credits and the expression `min_proceeds` is asserted against.
- **`PredictMoveError.code` renumbered for the `pricing` module.** `EBlockScholesPriceUnavailable` 13→12, `EBlockScholesSVIUnavailable` 14→13, `EBlockScholesMinVarianceInvalid` 15→14, `EOracleWrittenInThisTransaction` 17→15; `ETickNotInPriceMemo` and `ENonMonotonePriceMemo` are gone; `EBlockScholesInputTooWide` is new at 16. Code switching on numeric pricing codes breaks silently — match on `abortName` where possible.

