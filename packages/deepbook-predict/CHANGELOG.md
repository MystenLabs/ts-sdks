# @mysten/deepbook-predict

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
