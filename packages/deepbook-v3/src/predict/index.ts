// Public API for `@mysten/deepbook-v3/predict`. The curated surface is the `PredictClient`
// facade plus the value types, unit conversions, tick helpers, typed errors, and typed
// execution-result decoders — and the few primitives below that compose predict
// accounts into PTBs on FOREIGN packages, which no facade shape can cover.

// === Facade === (register as a client extension: `client.$extend(predict({ network }))`)
export { POSITION_LOT_SIZE, PredictClient, predict } from './client.js';
export type { PredictCompatibleClient } from './client.js';
export type {
	ActiveMarket,
	CloseOptions,
	MarketDescriptor,
	MarketSummary,
	MintAmountOptions,
	MintOptions,
	MintQuote,
	PoolSummary,
	RedeemQuote,
} from './client.js';

// === Composition with foreign packages === auth + deterministic account addressing
// for PTBs that compose predict accounts with packages this SDK doesn't know (e.g.
// `deepbook_core_account` spot trading). `deriveAccountWrapperId` is the pure
// `(cfg, owner)` form of `wrapperIdFor` for contexts with no client instance. These are
// Predict-config-bound conveniences over `@mysten/deepbook-v3/account`, which owns the
// shared account primitive — reach for its `AccountContract` to drive it directly.
export { deriveAccountWrapperId, generateAuth } from './tx/common.js';

// === Config ===
export { TESTNET_CONFIG, getConfig } from './config/index.js';
export type { PredictConfig, PredictPackages, UnderlyingConfig } from './config/index.js';

// === Units (raw ⇄ human conversions) === domain-specific only; the generic `toRaw`/
// `fromRaw` primitives stay internal to avoid colliding with consumers' own helpers.
export {
	U64_MAX,
	priceToRaw,
	probabilityToRaw,
	rawToPrice,
	rawToProbability,
	rawToUsdc,
	usdcToRaw,
} from './units.js';

// === Ticks ===
export { POS_INF_TICK, binaryRangeTicks } from './ticks.js';
export type { Side } from './ticks.js';

// === Client-side pricing === the deployed SVI digital math (skew-corrected, signed
// params, roll-down) as a float port, namespaced to keep the top-level surface clean:
// `pricing.upProbability`, `.boardPricer`, `.rollDown`, `.forward`, types `pricing.Svi` /
// `pricing.PricerInputs` / `pricing.BoardPricer`. Turnkey path: `client.predict.read.pricer(
// market)` reads the chain's resolved pricer once, then prices a whole board locally.
export * as pricing from './pricing.js';
export type { PricerSnapshot } from './reads/pricing.js';

// === Errors ===
export { PredictInputError, PredictMoveError, decodeMoveAbort } from './errors.js';
export type { MoveAbortError } from './errors.js';

// === Client seam + position type used in public read signatures ===
export type { ReadClient } from './reads/inspect.js';
export type { OpenPosition } from './reads/positions.js';

// === Execution-result decoder types === the decoders themselves are reached via
// `client.predict.decode.*`; only the receipt types are needed on the public surface.
export type {
	BalanceChangeReceipt,
	BuilderCodeReceipt,
	ClaimReceipt,
	CreateManagerReceipt,
	DecodableEvent,
	DecodableTransactionResult,
	MintReceipt,
	PlpCancelReceipt,
	PlpRequestReceipt,
	RedeemReceipt,
} from './decode.js';
