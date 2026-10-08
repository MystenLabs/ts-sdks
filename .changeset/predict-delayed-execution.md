---
'@mysten/deepbook-v3': minor
---

Add the Predict delayed-execution order flow (DBU-885). Queued mints and early sells fill at Pyth's signed price for a tick shortly after placement.

- `PredictClient.tx` gains `enqueueMint`, `enqueueMintAmount`, `enqueueMintCost`, `enqueueSell`, `refund` and `fill`. Each enqueue builder reads the market first and refuses an order the chain would abort with a typed `PredictPreflightError`, and returns the transaction with a preview of τ, the deadline, the escrow and the order fee. A sell whose cash need is above spare cash gets `rebalance_expiry_cash` after the enqueue by default.
- `PredictClient.read` gains `queue`, `order`, `orders`, `waitForOutcome`, `quoteSell`, `executionMode`, `pendingFunds` and `lazerPackages`. Where the config records delayed execution, `quoteMint` and `quoteMintCost` read the chain's quote functions and preview a queued fill.
- `PredictClient.decode` gains the queue event decoders and `expiryPnlRealized`, matched against the new optional `packages.predictDelayedExecution` type origin. `realizedPnlRaw` sums the realized P&L changes.
- New `queue` namespace (order codes, refund reasons, cash-need math, `maxMintNow`, timing previews, `orderView`, `reduceOrderEvents`, `slippageBand`), `queueTx` thunks, `describePredictError` and `isPreviewUnavailable`.
- `SessionsContract` gains `enqueueExactQuantity`, `enqueueExactAmount`, `enqueueExactCost` and `enqueueRedeemOpen`.
- The cost previews take the admin-set `feeIncentiveSubsidyRate`.
- Deprecated: the immediate `mint`, `mintAmount`, `mintCost` and `redeem` builders, their thunks and Sessions wrappers, `read.quoteRedeem` and `FEE_INCENTIVE_SUBSIDY_RATE`. The immediate trades abort once the version watermark reaches 4.

The Testnet and Mainnet configs don't record delayed execution yet, so the queued surface needs a custom `config` until those publications are synced.
