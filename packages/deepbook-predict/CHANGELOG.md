# @mysten/deepbook-predict

## 0.3.0

### Minor Changes

- d6808f0: Re-pin to the `predict-testnet-8-21` deployment (sourceCommit `1f79fe87`), which carries
  every Predict change on `main` plus the deployment-hardening commits. Regenerated the Move
  bindings and transcribed the new package/object ids.

  Breaking, following the contracts:

  - **Leverage is removed from the protocol.** `MintOptions.leverage`, `MintAmountOptions.leverage`,
    `MintReceipt.leverage`, and the `leverageToRaw` unit helper are gone; the deployed
    `mint_exact_quantity` / `mint_exact_amount` entrypoints no longer take a leverage argument.
  - **Liquidation is removed** (it existed only to close leveraged positions).
    `RedeemReceipt.liquidated` and `RedeemQuote.wouldLiquidate` are gone, along with the
    `LiquidatedOrderRedeemed` decoding path.
  - **`MintReceipt.netPremium` is now `premium`** (`raw.netPremium` → `raw.premium`), matching the
    renamed event field.
  - **New fee components surface on receipts**: `MintReceipt.fees.referral` and `.inventoryImpact`
    (referrers are now paid from mint fees; inventory impact is charged path-independently), and
    `RedeemReceipt.fees.inventoryImpactRebate`.
  - **A settled claim closes the order in full.** `tx.claimSettled(owner, market, { orderId })` no
    longer takes a `quantity` — the deployed `redeem_settled` has no quantity argument — and
    `ClaimReceipt` drops `quantityClosed` / `settlementPrice`, which the settled event no longer
    emits (it reports `payout` only).
  - **Numeric mint strikes must sit on the market's coarser admission grid.** `read.markets()` /
    `read.market()` now report `admissionTickSize` (`$100` against a `$0.01` tick on the current
    testnet deployment), and an off-grid strike throws `PredictInputError` at build time instead of
    aborting on chain with `EInvalidAdmissionTick`. The market's `referencePrice` remains admissible
    off-grid.
  - `read.quoteMint`'s `cost` now includes the inventory-impact charge, and `decode.redeem` /
    `read.quoteRedeem` account for the inventory-impact rebate, matching the deployed all-in cost
    and payout exactly.

  Value-semantics changes — these move NUMBERS, not just types, so re-check any code that pins them:

  - **`MintQuote.cost` / `raw.cost` now include the inventory-impact charge**, matching the deployed
    `all_in_cost`. The value is larger than in the previous release. The README tells integrators to
    pass `cost` as `maxCost`; the old value now under-budgets and the chain rejects it with
    `EMintCostAboveMax`.
  - **`RedeemReceipt.proceeds` / `raw.proceeds` (and `RedeemQuote.proceeds`) now add the
    inventory-impact rebate**, matching what `settle_live_redeem_payment` actually credits and the
    expression `min_proceeds` is asserted against.
  - **`PredictMoveError.code` renumbered for the `pricing` module.** `EBlockScholesPriceUnavailable`
    13→12, `EBlockScholesSVIUnavailable` 14→13, `EBlockScholesMinVarianceInvalid` 15→14,
    `EOracleWrittenInThisTransaction` 17→15; `ETickNotInPriceMemo` and `ENonMonotonePriceMemo` are
    gone; `EBlockScholesInputTooWide` is new at 16. Code switching on numeric pricing codes breaks
    silently — match on `abortName` where possible.

### Patch Changes

- Updated dependencies [fe68bf5]
  - @mysten/deepbook-account@0.1.0

## 0.2.1

### Patch Changes

- @mysten/deepbook-account@0.0.2

## 0.2.0

### Minor Changes

- af5efc8: Move the shared account layer out to `@mysten/deepbook-account`. The account primitive is
  not Predict-specific — DeepBook's own core account wrapper builds on the same Move package — so
  its bindings and builders now live in a dedicated package that Predict depends on.
  `deriveAccountWrapperId` and `generateAuth` are still exported from `@mysten/deepbook-predict`,
  and every transaction this SDK builds is byte-for-byte unchanged.

  **Breaking: removed `ACCUMULATOR_ROOT_ID`.** The generated move-call layer injects the well-known
  `AccumulatorRoot` singleton itself, as it does the `Clock`, so no caller needs the id to build a
  PTB against these bindings. Callers who passed it explicitly can drop the argument; anyone still
  needing the literal can use `0xacc` directly.

### Patch Changes

- Updated dependencies [af5efc8]
  - @mysten/deepbook-account@0.0.1

## 0.1.3

## 0.1.2

## 0.1.1

### Patch Changes

- 6ebc958: Regenerate the Move bindings. `AccumulatorRoot` is now auto-injected by the generated
  code, so call sites no longer pass `root` explicitly (the argument is still sent — the generated
  layer supplies it). Also drops three stale `propbook` feed modules whose Move sources no longer
  exist, and picks up four new `protocol_config` admin setters.

## 0.1.0

### Minor Changes

- fb8c6e1: Add facade capabilities and minimal composition exports. `MarketDescriptor` becomes a
  discriminated union that also accepts two-strike range positions (`side: 'range'` with
  `lower`/`upper` bounds) and an optional `marketId` pin that mints against an exact `ExpiryMarket`
  object instead of resolving by underlying+expiry. `tx.deposit` gains a `create: true` option that
  composes first-time funding into one PTB (create the account wrapper, deposit through the fresh
  handle, share last). The root entry now exports `generateAuth`, `deriveAccountWrapperId`,
  `ACCUMULATOR_ROOT_ID`, and `POSITION_LOT_SIZE` for PTBs that compose predict accounts with foreign
  packages.

### Patch Changes

- 5fd97fb: Add a client-side board pricer for painting a whole board without a chain call per
  strike. `client.predict.read.pricer(market)` does one simulate of the chain's resolved pricer and
  returns a `BoardPricer` (`up`/`down`/`range`/`strikeAtProbability`/`forward`) that evaluates every
  strike locally. The underlying math — a faithful float port of the deployed `pricing::compute_nd2`
  (SVI with skew correction, signed params, remaining-time roll-down) — is also exported under the
  `pricing` namespace (`upProbability`, `downProbability`, `rangeProbability`, `probability`,
  `strikeAtProbability`, `boardPricer`, `rollDown`, `forward`) for callers that already hold their
  own oracle inputs and want zero chain calls. Agreement with the on-chain price is bounded live to
  ~1e-7 by `tests/testnet/pricing-parity`.

## 0.0.1

### Patch Changes

- eefb735: Add `@mysten/deepbook-predict`, the TypeScript SDK for DeepBook Predict (European
  cash-settled range digitals). The `PredictClient` facade offers transaction builders (trade, PLP,
  account, builder codes), chain-only reads including market discovery, quotes, and position
  enumeration, and typed execution-receipt decoders — all built on `sui-ts-codegen`-generated
  contract bindings, with Move aborts surfaced as typed errors via clever-error decoding.
  Withdrawals default to depositing into the owner's DUSDC address balance
  (`0x2::coin::send_funds`), with a `{ toCoinObject: true }` opt-out for a discrete `Coin<T>`.
  Targets the live testnet deployment (`predict-testnet-7-29`); `getConfig('mainnet')` throws until
  Predict is deployed to mainnet.
