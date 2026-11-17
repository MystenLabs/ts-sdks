---
'@mysten/deepbook-v3': minor
---

Support DeepBook Predict version 6, which prices every trade, settlement and pool valuation from
signed Pyth Lazer and Block Scholes data carried into the transaction that uses it, and reads no
Propbook object.

**Quotes, prices and NAV are computed off chain.** Version 6 retires the on-chain views that priced
a market at the clock (`load_live_pricer`, `quote_mint*`, `quote_close*`, `quote_redeem_open*`,
`current_nav` and `live_order_value`). `read.price`, `read.pricer`, `read.quoteMint`,
`read.quoteMintCost`, `read.quoteSell`, `read.planMint`, `read.planSell` and the `nav` of
`read.market` now compute their numbers in the SDK, with the same pricing and fee math, from inputs
you supply. Pass a `PricingInputsProvider` as `pricingInputs` to `predict(...)` or `PredictClient`,
or pass `inputs` on a single call. Those reads throw `PredictInputError` without one. The SDK never
fetches Pyth or Block Scholes data itself. A refusal still throws the `PredictMoveError` the chain's
quote raised, such as `EOrderFailsLimits` or `ELivePricingExpired`. Quotes now include the market's
fee bands. The probability comes from the local pricer, which agrees with the chain to about 1e-4.
The new `pricerAt` builds a market's pricer from one set of inputs, and the `quotes` namespace
exports the quote engine for a quote service.

**Placement names no oracle object once a config records version 6.** New config fields
`packages.predictV6`, `packages.predictOrdersV3` and `packages.predictMathV3`, and
`sessionsPackageIdV5` for Sessions, are the call targets of the version 6 flow. With them set, the
queued-order builders call `queue::enqueue_*_v2`, the Sessions wrappers call `enqueue_*_v2`, the
open filler commits with `queue::commit_v2` and the signed Block Scholes batches, and every other
Predict and order-flow call targets the same packages. The Testnet and Mainnet records leave them
unset until the upgrade executes, so this release keeps calling the version 5 packages there. A
release that records them follows the upgrade. The low-level `queueTx.enqueue*V2` builders take an
optional `builder` for the `_with_builder_v2` forms, and `queueTx.commitV2` and `queueTx.fillV2`
build the version 6 commit.

**New reads and decoders.** `read.oracleBinding(underlying)` decodes an underlying's oracle binding
(its Lazer feed and channel, and its Block Scholes base asset, SVI model and decimals).
`read.bsTiming()` reads the order desk's Block Scholes slot timing, and `queue.bsSlots` computes the
slots a commit at τ takes. `read.feeBands(market)` reads a market's fee bands.
`decode.oracleBindingUpdates` and `decode.bsTimingUpdates` decode `OracleBindingUpdated` and
`BsTimingUpdated`, which match the version 6 package IDs because version 6 defines them. Refund
reason 10 (`queue.REFUND_REASON.NO_VOL`) means the committed volatility data built no price at the
fill time, and returns the order fee. A version 6 mint reports a `subsidyBound` of 0 at placement.
`decodeMoveAbort` names the version 6 aborts, including `EUseV2`, `EWrongVol`,
`EOracleBindingMissing` and `EInvalidBsTiming`.

**Removed.** `tx.mint`, `tx.mintAmount`, `tx.mintCost`, `tx.redeem` and `read.quoteRedeem` are
removed, along with the `SessionsContract` wrappers `mintExactQuantity`, `mintExactAmount`,
`mintExactCost` and `redeemLive` and the exported `loadLivePricer`. They traded against the live
on-chain price, which delayed execution had already retired and version 6 removes. Queue orders with
`read.planMint`, `read.planSell` and `tx.enqueuePlan`, or the `tx.enqueue*` builders.

The regenerated bindings add the version 6 entry points (`queue::enqueue_*_v2`, `queue::commit_v2`,
`expiry_market::try_settle_v2`, `set_reference_tick_v2`, `plp::snapshot_expiry_pricer_v2`,
`registry::create_and_share_expiry_market_v2`, `protocol_config::set_oracle_binding` and
`desk::set_bs_timing`) and the `block_scholes` module (`blockScholesMoveCalls`). The bindings of the
entry points version 6 retires keep the argument keys they shipped with. The config's `oracle` block
now records the Block Scholes verifier package and its signer registry.
