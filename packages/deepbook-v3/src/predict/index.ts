// Copyright (c) Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Public API for `@mysten/deepbook-v3/predict`. The curated surface is the `PredictClient`
// facade plus the value types, unit conversions, tick helpers, typed errors, and typed
// execution-result decoders — and, for composing your own PTBs, the few primitives below
// that compose predict accounts with FOREIGN packages plus the generated move-call bindings.

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
	PlpSupplyOptions,
	PlpWithdrawOptions,
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

// === Move-call bindings === the generated transaction thunks for every Predict module with a
// callable function, for putting Predict calls into a PTB you are building — each facade `tx.*`
// builder returns a finished `Transaction` instead. Mirrors `/account`'s `accountMoveCalls`. Pass
// `config: toGeneratedConfig(cfg)` and the shared objects fill themselves in; owner-authorized
// calls take an `Auth` from `generateAuth(cfg)`. Each namespace also carries its module's BCS
// structs; the `*Events` namespaces are event layouts only.
export * as adminMoveCalls from '../contracts/deepbook_predict/admin.js';
export * as builderCodeMoveCalls from '../contracts/deepbook_predict/builder_code.js';
export * as expiryMarketMoveCalls from '../contracts/deepbook_predict/expiry_market.js';
export * as marketLifecycleCapMoveCalls from '../contracts/deepbook_predict/market_lifecycle_cap.js';
export * as marketManagerMoveCalls from '../contracts/deepbook_predict/market_manager.js';
export * as pauseCapMoveCalls from '../contracts/deepbook_predict/pause_cap.js';
export * as plpMoveCalls from '../contracts/deepbook_predict/plp.js';
export * as poolValuationCapMoveCalls from '../contracts/deepbook_predict/pool_valuation_cap.js';
export * as predictAccountMoveCalls from '../contracts/deepbook_predict/predict_account.js';
export * as pricingMoveCalls from '../contracts/deepbook_predict/pricing.js';
export * as protocolConfigMoveCalls from '../contracts/deepbook_predict/protocol_config.js';
export * as rangeCodecMoveCalls from '../contracts/deepbook_predict/range_codec.js';
export * as registryMoveCalls from '../contracts/deepbook_predict/registry.js';
export * as builderCodeEvents from '../contracts/deepbook_predict/builder_code_events.js';
export * as configEvents from '../contracts/deepbook_predict/config_events.js';
export * as orderEvents from '../contracts/deepbook_predict/order_events.js';
export * as vaultEvents from '../contracts/deepbook_predict/vault_events.js';

// === Config ===
export {
	MAINNET_CONFIG,
	TESTNET_CONFIG,
	getConfig,
	getDeployment,
	getUnits,
	MAINNET_DEPLOYMENT,
	MAINNET_UNITS,
	TESTNET_DEPLOYMENT,
	TESTNET_UNITS,
} from './config/index.js';
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

// The `/sessions` Predict wrappers take `pricer` as a PTB result of this call, so it has to
// be reachable from the published surface for those builders to be composable at all.
export { loadLivePricer, type MarketFeeds } from './tx/trade.js';
// `loadLivePricer` takes the projected config, so the projection and its type have to be
// reachable too — without them the `/sessions` Predict wrappers cannot be composed at all.
export { toGeneratedConfig, type GeneratedConfig } from './config/generated.js';
