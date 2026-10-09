---
'@mysten/deepbook-v3': minor
---

Add the Predict delayed-execution order flow (DBU-885). Queued mints and early sells fill at Pyth's signed price for a tick shortly after placement. Delayed execution spans three packages: the Predict upgrade, the order-flow package `deepbook_predict_orders` (each market's `MarketQueue`, the shared `OrderDesk`, every queued-order entry point and the queue events) and the math library `deepbook_predict_math`.

- `PredictClient.tx` gains `enqueueMint`, `enqueueMintAmount`, `enqueueMintCost`, `enqueueSell`, `refund`, `fill`, and the permissionless `claimParked` and `payOpen` for USDC a denied receive address couldn't take. Each enqueue builder reads the market first and refuses an order the queue or protocol gates would abort with a typed `PredictPreflightError`, and returns the transaction with a preview of τ, the deadline, the escrow and the order fee. A sell whose cash need is above spare cash gets `rebalance_expiry_cash` after the enqueue by default.
- `PredictClient.read` gains `queue`, `order`, `orders`, `waitForOutcome`, `quoteSell`, `executionMode`, `pendingFunds` and `lazerPackages`, and `PredictClient` gains `queueIdFor`. Where the config records delayed execution, `quoteMint` and `quoteMintCost` read the chain's quote functions and preview a queued fill.
- `PredictClient.decode` gains the queue event decoders (matched against the order-flow package's original ID, including `recordFunds` for parked and claimed USDC), `policyUpdates` and `expiryPnlRealized`. Refund reason 9 is a denied receive address. `realizedPnlRaw` sums the realized P&L changes.
- New config: `packages.predictDelayedExecution`, `packages.predictOrders`, `packages.predictOrdersV1`, `packages.predictMath`, `objects.orderDesk` and `objects.queueRegistry`, all optional. Queue IDs derive from the queue registry.
- New `queue` namespace (order codes, refund reasons, settlement phases, cash-need math, `maxMintNow`, timing previews, `orderView`, `reduceOrderEvents`, `slippageBand`), `queueTx` thunks (the enqueues, `createQueue`, `commit`, `resolve`, `refund`, `adminRefund`, `settleStep`, `payOpen`, `claimParked`, `cleanup`, `fill`), `toOrdersConfig`, `deriveQueueId`, `orderFlowWitnessType` and `describePredictError`, plus the generated bindings of both new packages.
- `SessionsContract` gains `enqueueExactQuantity`, `enqueueExactAmount`, `enqueueExactCost` and `enqueueRedeemOpen`, which take the order desk and the queue registry and need Sessions v3.
- The cost previews take the admin-set `feeIncentiveSubsidyRate`.
- Deprecated: the immediate `mint`, `mintAmount`, `mintCost` and `redeem` builders, their thunks and Sessions wrappers, `read.quoteRedeem` and `FEE_INCENTIVE_SUBSIDY_RATE`. Predict v4 always aborts the immediate trades.

The Testnet config records the Testnet rollout: Predict v5, Sessions v3, `deepbook_predict_orders`, `deepbook_predict_math`, the order desk, the queue registry and the Pyth Lazer state. The Mainnet config doesn't record delayed execution yet, so the queued surface needs a custom `config` there until the Mainnet rollout is synced. `sync-deployment` now reads the two new packages' `Published.toml` records.
