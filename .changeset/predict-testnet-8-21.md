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
