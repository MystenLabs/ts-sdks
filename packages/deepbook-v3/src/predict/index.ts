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
	EnqueueMintAmountOptions,
	EnqueueMintCostOptions,
	EnqueueMintOptions,
	EnqueueSellOptions,
	MarketCoordinates,
	MarketDescriptor,
	MarketQueueView,
	MarketSummary,
	MintAmountOptions,
	MintCostOptions,
	MintOptions,
	MintQuote,
	PlpSupplyOptions,
	PlpWithdrawOptions,
	PoolSummary,
	QueuedOrderOutcome,
	QueuedOrderPlan,
	QueuedOrderPreview,
	QueuedOrderView,
	RedeemQuote,
	SellQuote,
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

// === Order-flow companion and math library bindings (delayed execution, DBU-885) ===
// `deepbook_predict_orders` holds the queued-order flow: each market's `MarketQueue` and every
// queued-order entry point and queue read (`queueMoveCalls`), the shared `OrderDesk` with its
// policy setters (`deskMoveCalls`), the record layouts (`orderQueueMoveCalls`), the policy layout
// (`delayedExecutionConfigMoveCalls`) and the queue events (`queueEvents`). Pass
// `config: toOrdersConfig(cfg)`, which adds the companion package and the desk to the projected
// config. `deepbook_predict_math` is the pure math library (`predictMathMoveCalls`) and the
// `LazerPrice` a verified Pyth Lazer update decodes to (`lazerPriceMoveCalls`).
export * as queueMoveCalls from '../contracts/deepbook_predict_orders/queue.js';
export * as deskMoveCalls from '../contracts/deepbook_predict_orders/desk.js';
export * as orderQueueMoveCalls from '../contracts/deepbook_predict_orders/order_queue.js';
export * as delayedExecutionConfigMoveCalls from '../contracts/deepbook_predict_orders/delayed_execution_config.js';
export * as queueEvents from '../contracts/deepbook_predict_orders/queue_events.js';
export * as predictMathMoveCalls from '../contracts/deepbook_predict_math/math.js';
export * as lazerPriceMoveCalls from '../contracts/deepbook_predict_math/lazer_price.js';

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

// === Client-side cost === the deployed FEE math as an exact integer port, so a quote needs no
// chain call: `cost.mintCost` (all-in debit for a quantity), `cost.mintCostForBudget` (the
// `mint_exact_cost` budget search), `cost.redeemLiveProceeds` (net credited by a live close),
// plus the components they are built from. Probabilities come from `pricing.*` or from the
// chain (`read.price`); the fee policy is the market's `MarketCreated` snapshot, with
// `cost.SHIPPED_FEE_POLICY` as the shipped template.
export * as cost from './cost.js';

// === Delayed execution === the queued-order codes, cash-need math, timing previews and
// order-state views as pure functions over raw bigints: `queue.ORDER_STATUS`,
// `queue.REFUND_REASONS`, `queue.cashNeedExactQuantity`, `queue.maxMintNow`,
// `queue.previewTiming`, `queue.orderView`, `queue.reduceOrderEvents`, `queue.slippageBand`. The
// facade's `tx.enqueue*` / `read.queue` / `decode.queueEvents` drive them.
export * as queue from './queue.js';
// The queued-order thunks, for composing an enqueue, a refund, the filler or the keeper's
// settlement steps into a PTB you are building: `queueTx.enqueueExactCost(toOrdersConfig(cfg),
// …)`. Each addresses the market's queue at `deriveQueueId(registry, market)` unless given a
// `queueId`. They run the static checks (a real `max_cost` cap, explicit sell floors) but not
// the facade's chain preflight. `commit` and `fill` compose Pyth Lazer's verifier, a package
// this SDK doesn't generate.
export * as queueTx from './tx/queue.js';
export type { ExecutionMode, MarketQueueState } from './reads/queue.js';
// The ID of a market's `MarketQueue` under an order desk, as `queue::queue_id` derives it, and
// the companion's `OrderFlow` witness type that Predict's order-flow allowlist names.
export { deriveQueueId } from './queue-id.js';
export { orderFlowWitnessType } from './reads/queue.js';

// === Errors ===
export {
	PredictInputError,
	PredictMoveError,
	PredictPreflightError,
	decodeMoveAbort,
	describePredictError,
} from './errors.js';
export type { MoveAbortError, PredictPreflightCode } from './errors.js';

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
	// Delayed execution.
	CohortCommitReceipt,
	EnqueueReceipt,
	MarketPayoutsCompletedReceipt,
	OpenRecordPayoutReceipt,
	PolicyUpdateReceipt,
	QueueCashFigures,
	QueueEvent,
	QueueOpsReceipt,
	QueuedFillReceipt,
	RecordFundsReceipt,
	QueuedRefundReceipt,
	ExpiryPnlRealizedReceipt,
} from './decode.js';
// The signed sum of `decode.expiryPnlRealized` receipts: the pool's gross realized P&L, raw.
export { realizedPnlRaw } from './decode.js';

// The `/sessions` Predict wrappers take `pricer` as a PTB result of this call, so it has to
// be reachable from the published surface for those builders to be composable at all.
export { loadLivePricer, type MarketFeeds } from './tx/trade.js';
// `loadLivePricer` takes the projected config, so the projection and its type have to be
// reachable too — without them the `/sessions` Predict wrappers cannot be composed at all.
// `toOrdersConfig` adds the order-flow companion and its desk, for `queueTx` and the companion
// bindings; it throws while the config doesn't record delayed execution.
export {
	toGeneratedConfig,
	toOrdersConfig,
	type GeneratedConfig,
	type OrdersGeneratedConfig,
} from './config/generated.js';
