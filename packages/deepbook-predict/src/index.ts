// Public API for `@mysten/deepbook-predict`. The curated surface is the `PredictClient`
// facade plus the value types, unit conversions, tick helpers, typed errors, and typed
// execution-result decoders. Low-level move-call builders and raw reads are internal to
// the facade; power users who need to compose PTBs directly can use the generated
// bindings under `contracts/` or the facade's exported primitives on request.

// === Facade ===
export { PredictClient } from './client.js';
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

// === Config ===
export { TESTNET_CONFIG, getConfig } from './config/index.js';
export type { PredictConfig, PredictPackages, UnderlyingConfig } from './config/index.js';

// === Units (raw ⇄ human conversions) ===
export {
	U64_MAX,
	fromRaw,
	leverageToRaw,
	priceToRaw,
	probabilityToRaw,
	rawToPrice,
	rawToProbability,
	rawToUsdc,
	toRaw,
	usdcToRaw,
} from './units.js';

// === Ticks ===
export { POS_INF_TICK, binaryRangeTicks } from './ticks.js';
export type { Side } from './ticks.js';

// === Errors ===
export { PredictInputError, PredictMoveError, decodeMoveAbort } from './errors.js';
export type { MoveAbortError } from './errors.js';

// === Client seam + position type used in public read signatures ===
export type { ReadClient } from './reads/inspect.js';
export type { OpenPosition } from './reads/positions.js';

// === Execution-result decoders (pure event parsing, no network) ===
export {
	decodeAccountsCreated,
	decodeBuilderCodeSets,
	decodeClaims,
	decodeDeposits,
	decodeMints,
	decodePlpCancels,
	decodePlpRequests,
	decodeRedeems,
	decodeWithdrawals,
} from './decode.js';
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
