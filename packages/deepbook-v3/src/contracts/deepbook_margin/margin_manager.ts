/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction, type TransactionArgument } from '@mysten/sui/transactions';
import * as balance_manager from './deps/deepbook/balance_manager.js';
import * as tpsl from './tpsl.js';
import * as vec_map from './deps/sui/vec_map.js';
import * as type_name from './deps/std/type_name.js';
const $moduleName = '@deepbook/margin::margin_manager';
export const MarginApp = new MoveStruct({
	name: `${$moduleName}::MarginApp`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const MarginManager = new MoveStruct({
	name: `${$moduleName}::MarginManager<phantom BaseAsset, phantom QuoteAsset>`,
	fields: {
		id: bcs.Address,
		owner: bcs.Address,
		deepbook_pool: bcs.Address,
		margin_pool_id: bcs.option(bcs.Address),
		balance_manager: balance_manager.BalanceManager,
		deposit_cap: balance_manager.DepositCap,
		withdraw_cap: balance_manager.WithdrawCap,
		trade_cap: balance_manager.TradeCap,
		borrowed_base_shares: bcs.u64(),
		borrowed_quote_shares: bcs.u64(),
		take_profit_stop_loss: tpsl.TakeProfitStopLoss,
		extra_fields: vec_map.VecMap(bcs.string(), bcs.u64()),
	},
});
export const ManagerInitializer = new MoveStruct({
	name: `${$moduleName}::ManagerInitializer`,
	fields: {
		margin_manager_id: bcs.Address,
	},
});
export const MarginManagerCreatedEvent = new MoveStruct({
	name: `${$moduleName}::MarginManagerCreatedEvent`,
	fields: {
		margin_manager_id: bcs.Address,
		balance_manager_id: bcs.Address,
		deepbook_pool_id: bcs.Address,
		owner: bcs.Address,
		timestamp: bcs.u64(),
	},
});
export const LoanBorrowedEvent = new MoveStruct({
	name: `${$moduleName}::LoanBorrowedEvent`,
	fields: {
		margin_manager_id: bcs.Address,
		margin_pool_id: bcs.Address,
		loan_amount: bcs.u64(),
		loan_shares: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const LoanRepaidEvent = new MoveStruct({
	name: `${$moduleName}::LoanRepaidEvent`,
	fields: {
		margin_manager_id: bcs.Address,
		margin_pool_id: bcs.Address,
		repay_amount: bcs.u64(),
		repay_shares: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const LiquidationEvent = new MoveStruct({
	name: `${$moduleName}::LiquidationEvent`,
	fields: {
		margin_manager_id: bcs.Address,
		margin_pool_id: bcs.Address,
		liquidation_amount: bcs.u64(),
		pool_reward: bcs.u64(),
		pool_default: bcs.u64(),
		risk_ratio: bcs.u64(),
		remaining_base_asset: bcs.u64(),
		remaining_quote_asset: bcs.u64(),
		remaining_base_debt: bcs.u64(),
		remaining_quote_debt: bcs.u64(),
		base_pyth_price: bcs.u64(),
		base_pyth_decimals: bcs.u8(),
		quote_pyth_price: bcs.u64(),
		quote_pyth_decimals: bcs.u8(),
		timestamp: bcs.u64(),
	},
});
export const DepositCollateralEvent = new MoveStruct({
	name: `${$moduleName}::DepositCollateralEvent`,
	fields: {
		margin_manager_id: bcs.Address,
		amount: bcs.u64(),
		asset: type_name.TypeName,
		pyth_price: bcs.u64(),
		pyth_decimals: bcs.u8(),
		timestamp: bcs.u64(),
	},
});
export const WithdrawCollateralEvent = new MoveStruct({
	name: `${$moduleName}::WithdrawCollateralEvent`,
	fields: {
		margin_manager_id: bcs.Address,
		amount: bcs.u64(),
		asset: type_name.TypeName,
		withdraw_base_asset: bcs.bool(),
		remaining_base_asset: bcs.u64(),
		remaining_quote_asset: bcs.u64(),
		remaining_base_debt: bcs.u64(),
		remaining_quote_debt: bcs.u64(),
		base_pyth_price: bcs.u64(),
		base_pyth_decimals: bcs.u8(),
		quote_pyth_price: bcs.u64(),
		quote_pyth_decimals: bcs.u8(),
		timestamp: bcs.u64(),
	},
});
export interface AddConditionalOrderArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	basePriceInfoObject: RawTransactionArgument<string>;
	quotePriceInfoObject: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	conditionalOrderId: RawTransactionArgument<number | bigint>;
	condition: TransactionArgument;
	pendingOrder: TransactionArgument;
}
export interface AddConditionalOrderOptions {
	package?: string;
	arguments:
		| AddConditionalOrderArguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				basePriceInfoObject: RawTransactionArgument<string>,
				quotePriceInfoObject: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				conditionalOrderId: RawTransactionArgument<number | bigint>,
				condition: TransactionArgument,
				pendingOrder: TransactionArgument,
		  ];
	typeArguments: [string, string];
}
/**
 * Add a conditional order (take-profit / stop-loss). Specifies the condition under
 * which it triggers and the pending order to place when it does.
 *
 * Lifetime: the conditional order itself is never clamped — it rests in the queue
 * until it triggers or is cancelled. A _market_ pending order
 * (`tpsl::new_pending_market_order`) has no expiry, so it is the "until cancelled"
 * stop: it waits indefinitely and, when triggered, fires and deleverages via
 * `execute_conditional_orders_v3` (so it can protect even in the danger band). A
 * _limit_ pending order is intentionally transient — when it triggers, the resting
 * order it places is clamped to `max_order_ttl_ms` (default 3 days) by
 * `clamp_expire_timestamp`, the same stale-price guard as any margin limit order.
 * For a permanent stop, use a market pending order.
 */
export function addConditionalOrder(options: AddConditionalOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		'u64',
		null,
		null,
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'pool',
		'basePriceInfoObject',
		'quotePriceInfoObject',
		'registry',
		'conditionalOrderId',
		'condition',
		'pendingOrder',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'add_conditional_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelAllConditionalOrdersArguments {
	self: RawTransactionArgument<string>;
}
export interface CancelAllConditionalOrdersOptions {
	package?: string;
	arguments: CancelAllConditionalOrdersArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Cancel all conditional orders. */
export function cancelAllConditionalOrders(options: CancelAllConditionalOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'cancel_all_conditional_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelConditionalOrderArguments {
	self: RawTransactionArgument<string>;
	conditionalOrderId: RawTransactionArgument<number | bigint>;
}
export interface CancelConditionalOrderOptions {
	package?: string;
	arguments:
		| CancelConditionalOrderArguments
		| [
				self: RawTransactionArgument<string>,
				conditionalOrderId: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Cancel a conditional order. */
export function cancelConditionalOrder(options: CancelConditionalOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'u64', '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'conditionalOrderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'cancel_conditional_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExecuteConditionalOrdersArguments {
	Self: RawTransactionArgument<string>;
	Pool: RawTransactionArgument<string>;
	BasePriceInfoObject: RawTransactionArgument<string>;
	QuotePriceInfoObject: RawTransactionArgument<string>;
	Registry: RawTransactionArgument<string>;
	MaxOrdersToExecute: RawTransactionArgument<number | bigint>;
}
export interface ExecuteConditionalOrdersOptions {
	package?: string;
	arguments:
		| ExecuteConditionalOrdersArguments
		| [
				Self: RawTransactionArgument<string>,
				Pool: RawTransactionArgument<string>,
				BasePriceInfoObject: RawTransactionArgument<string>,
				QuotePriceInfoObject: RawTransactionArgument<string>,
				Registry: RawTransactionArgument<string>,
				MaxOrdersToExecute: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * DEPRECATED. Use `execute_conditional_orders_v2`.
 *
 * The v1 entry preserves its on-chain signature so the v5 package upgrade
 * type-checks against existing dependents, but the body is replaced with
 * `abort EDeprecatedUseV2`. The v2 variant adds margin-pool + oracle params and
 * enforces a post-fill `risk_ratio >= min_borrow_risk_ratio` invariant inside
 * `process_collected_orders_v2`.
 */
export function executeConditionalOrders(options: ExecuteConditionalOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, 'u64', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'Self',
		'Pool',
		'BasePriceInfoObject',
		'QuotePriceInfoObject',
		'Registry',
		'MaxOrdersToExecute',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'execute_conditional_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExecuteConditionalOrdersV2Arguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	basePriceInfoObject: RawTransactionArgument<string>;
	quotePriceInfoObject: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	maxOrdersToExecute: RawTransactionArgument<number | bigint>;
}
export interface ExecuteConditionalOrdersV2Options {
	package?: string;
	arguments:
		| ExecuteConditionalOrdersV2Arguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				basePriceInfoObject: RawTransactionArgument<string>,
				quotePriceInfoObject: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				maxOrdersToExecute: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Execute conditional orders and return the order infos. This is a permissionless
 * function that can be called by anyone.
 *
 * v2 adds `base_margin_pool` + `quote_margin_pool` parameters and enforces a
 * post-fill `risk_ratio >= min_borrow_risk_ratio` invariant inside the inner loop.
 * If any single triggered fill would breach that floor, the entire txn aborts — no
 * partial-state landing.
 */
export function executeConditionalOrdersV2(options: ExecuteConditionalOrdersV2Options) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'basePriceInfoObject',
		'quotePriceInfoObject',
		'registry',
		'maxOrdersToExecute',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'execute_conditional_orders_v2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ExecuteConditionalOrdersV3Arguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	basePriceInfoObject: RawTransactionArgument<string>;
	quotePriceInfoObject: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	maxOrdersToExecute: RawTransactionArgument<number | bigint>;
}
export interface ExecuteConditionalOrdersV3Options {
	package?: string;
	arguments:
		| ExecuteConditionalOrdersV3Arguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				basePriceInfoObject: RawTransactionArgument<string>,
				quotePriceInfoObject: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				maxOrdersToExecute: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Execute conditional orders, deleveraging on each market-type fill.
 * Permissionless, like `execute_conditional_orders_v2`, with the same trigger and
 * cancellation handling — but takes the margin pools as `&mut` and repays the loan
 * with the market proceeds before gating on the net (post-repay) `risk_ratio`
 * being at least the pre-fill ratio.
 *
 * This is what lets a stop-loss fire in the `liquidation..min_borrow` danger band:
 * a swap alone only lowers the oracle-valued ratio (so the v2 borrow-floor gate
 * rejects it), while repaying actually improves it. If a single triggered fill
 * would worsen net solvency the whole txn aborts — no partial-state landing.
 */
export function executeConditionalOrdersV3(options: ExecuteConditionalOrdersV3Options) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
		'basePriceInfoObject',
		'quotePriceInfoObject',
		'registry',
		'maxOrdersToExecute',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'execute_conditional_orders_v3',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewArguments {
	pool: RawTransactionArgument<string>;
	deepbookRegistry: RawTransactionArgument<string>;
	marginRegistry: RawTransactionArgument<string>;
}
export interface NewOptions {
	package?: string;
	arguments:
		| NewArguments
		| [
				pool: RawTransactionArgument<string>,
				deepbookRegistry: RawTransactionArgument<string>,
				marginRegistry: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Creates a new margin manager and shares it. */
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['pool', 'deepbookRegistry', 'marginRegistry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewWithInitializerArguments {
	pool: RawTransactionArgument<string>;
	deepbookRegistry: RawTransactionArgument<string>;
	marginRegistry: RawTransactionArgument<string>;
}
export interface NewWithInitializerOptions {
	package?: string;
	arguments:
		| NewWithInitializerArguments
		| [
				pool: RawTransactionArgument<string>,
				deepbookRegistry: RawTransactionArgument<string>,
				marginRegistry: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Creates a new margin manager and returns it along with an initializer. The
 * initializer is used to ensure the margin manager is shared after creation.
 */
export function newWithInitializer(options: NewWithInitializerOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['pool', 'deepbookRegistry', 'marginRegistry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'new_with_initializer',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ShareArguments {
	manager: RawTransactionArgument<string>;
	initializer: TransactionArgument;
}
export interface ShareOptions {
	package?: string;
	arguments:
		| ShareArguments
		| [manager: RawTransactionArgument<string>, initializer: TransactionArgument];
	typeArguments: [string, string];
}
/** Shares the margin manager. The initializer is dropped in the process. */
export function share(options: ShareOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['manager', 'initializer'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'share',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RegisterMarginManagerArguments {
	self: RawTransactionArgument<string>;
	marginRegistry: RawTransactionArgument<string>;
}
export interface RegisterMarginManagerOptions {
	package?: string;
	arguments:
		| RegisterMarginManagerArguments
		| [self: RawTransactionArgument<string>, marginRegistry: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Register the margin manager back to the margin registry. */
export function registerMarginManager(options: RegisterMarginManagerOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'marginRegistry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'register_margin_manager',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UnregisterMarginManagerArguments {
	self: RawTransactionArgument<string>;
	marginRegistry: RawTransactionArgument<string>;
}
export interface UnregisterMarginManagerOptions {
	package?: string;
	arguments:
		| UnregisterMarginManagerArguments
		| [self: RawTransactionArgument<string>, marginRegistry: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Unregister the margin manager from the margin registry. */
export function unregisterMarginManager(options: UnregisterMarginManagerOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'marginRegistry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'unregister_margin_manager',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetMarginManagerReferralArguments {
	self: RawTransactionArgument<string>;
	referralCap: RawTransactionArgument<string>;
}
export interface SetMarginManagerReferralOptions {
	package?: string;
	arguments:
		| SetMarginManagerReferralArguments
		| [self: RawTransactionArgument<string>, referralCap: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Set the referral for the margin manager. */
export function setMarginManagerReferral(options: SetMarginManagerReferralOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'referralCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'set_margin_manager_referral',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UnsetMarginManagerReferralArguments {
	self: RawTransactionArgument<string>;
	poolId: RawTransactionArgument<string>;
}
export interface UnsetMarginManagerReferralOptions {
	package?: string;
	arguments:
		| UnsetMarginManagerReferralArguments
		| [self: RawTransactionArgument<string>, poolId: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Unset the referral for the margin manager. */
export function unsetMarginManagerReferral(options: UnsetMarginManagerReferralOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'poolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'unset_margin_manager_referral',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DepositArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
}
export interface DepositOptions {
	package?: string;
	arguments:
		| DepositArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string, string];
}
/**
 * Deposit a coin into the margin manager. The coin must be of the same type as
 * either the base, quote, or DEEP.
 */
export function deposit(options: DepositOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'registry', 'baseOracle', 'quoteOracle', 'coin'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'deposit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	withdrawAmount: RawTransactionArgument<number | bigint>;
}
export interface WithdrawOptions {
	package?: string;
	arguments:
		| WithdrawArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				withdrawAmount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string, string];
}
/**
 * Withdraw a specified amount of an asset from the margin manager. The asset must
 * be of the same type as either the base, quote, or DEEP. The withdrawal is
 * subject to the risk ratio limit.
 */
export function withdraw(options: WithdrawOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'registry',
		'baseMarginPool',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'pool',
		'withdrawAmount',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'withdraw',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowBaseArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	loanAmount: RawTransactionArgument<number | bigint>;
}
export interface BorrowBaseOptions {
	package?: string;
	arguments:
		| BorrowBaseArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				loanAmount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Borrow the base asset using the margin manager. */
export function borrowBase(options: BorrowBaseOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'registry',
		'baseMarginPool',
		'baseOracle',
		'quoteOracle',
		'pool',
		'loanAmount',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'borrow_base',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowQuoteArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	loanAmount: RawTransactionArgument<number | bigint>;
}
export interface BorrowQuoteOptions {
	package?: string;
	arguments:
		| BorrowQuoteArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				loanAmount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Borrow the quote asset using the margin manager. */
export function borrowQuote(options: BorrowQuoteOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		null,
		null,
		null,
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'registry',
		'quoteMarginPool',
		'baseOracle',
		'quoteOracle',
		'pool',
		'loanAmount',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'borrow_quote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RepayBaseArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	marginPool: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint | null>;
}
export interface RepayBaseOptions {
	package?: string;
	arguments:
		| RepayBaseArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				marginPool: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint | null>,
		  ];
	typeArguments: [string, string];
}
/**
 * Repay the base asset loan using the margin manager. Returns the total amount
 * repaid
 */
export function repayBase(options: RepayBaseOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		'0x1::option::Option<u64>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'marginPool', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'repay_base',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RepayQuoteArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	marginPool: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint | null>;
}
export interface RepayQuoteOptions {
	package?: string;
	arguments:
		| RepayQuoteArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				marginPool: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint | null>,
		  ];
	typeArguments: [string, string];
}
/**
 * Repay the quote asset loan using the margin manager. Returns the total amount
 * repaid
 */
export function repayQuote(options: RepayQuoteOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		null,
		'0x1::option::Option<u64>',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = ['self', 'registry', 'marginPool', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'repay_quote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LiquidateArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	marginPool: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	repayCoin: RawTransactionArgument<string>;
}
export interface LiquidateOptions {
	package?: string;
	arguments:
		| LiquidateArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				marginPool: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				repayCoin: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string, string];
}
export function liquidate(options: LiquidateOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'self',
		'registry',
		'baseOracle',
		'quoteOracle',
		'marginPool',
		'pool',
		'repayCoin',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'liquidate',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RiskRatioArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
}
export interface RiskRatioOptions {
	package?: string;
	arguments:
		| RiskRatioArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
export function riskRatio(options: RiskRatioOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'self',
		'registry',
		'baseOracle',
		'quoteOracle',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'risk_ratio',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RiskRatioUnsafeArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
}
export interface RiskRatioUnsafeOptions {
	package?: string;
	arguments:
		| RiskRatioUnsafeArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Returns the risk ratio without validating oracle price staleness or confidence.
 * Use for read-only queries where stale prices are acceptable.
 */
export function riskRatioUnsafe(options: RiskRatioUnsafeOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'self',
		'registry',
		'baseOracle',
		'quoteOracle',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'risk_ratio_unsafe',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BalanceManagerArguments {
	self: RawTransactionArgument<string>;
}
export interface BalanceManagerOptions {
	package?: string;
	arguments: BalanceManagerArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function balanceManager(options: BalanceManagerOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'balance_manager',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BaseBalanceArguments {
	self: RawTransactionArgument<string>;
}
export interface BaseBalanceOptions {
	package?: string;
	arguments: BaseBalanceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function baseBalance(options: BaseBalanceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'base_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface QuoteBalanceArguments {
	self: RawTransactionArgument<string>;
}
export interface QuoteBalanceOptions {
	package?: string;
	arguments: QuoteBalanceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function quoteBalance(options: QuoteBalanceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'quote_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeepBalanceArguments {
	self: RawTransactionArgument<string>;
}
export interface DeepBalanceOptions {
	package?: string;
	arguments: DeepBalanceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function deepBalance(options: DeepBalanceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'deep_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CalculateAssetsArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface CalculateAssetsOptions {
	package?: string;
	arguments:
		| CalculateAssetsArguments
		| [self: RawTransactionArgument<string>, pool: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Returns (base_asset, quote_asset) for margin manager. */
export function calculateAssets(options: CalculateAssetsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'calculate_assets',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CalculateDebtsArguments {
	self: RawTransactionArgument<string>;
	marginPool: RawTransactionArgument<string>;
}
export interface CalculateDebtsOptions {
	package?: string;
	arguments:
		| CalculateDebtsArguments
		| [self: RawTransactionArgument<string>, marginPool: RawTransactionArgument<string>];
	typeArguments: [string, string, string];
}
export function calculateDebts(options: CalculateDebtsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, '0x2::clock::Clock'] satisfies (string | null)[];
	const parameterNames = ['self', 'marginPool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'calculate_debts',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ManagerStateArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	baseOracle: RawTransactionArgument<string>;
	quoteOracle: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	baseMarginPool: RawTransactionArgument<string>;
	quoteMarginPool: RawTransactionArgument<string>;
}
export interface ManagerStateOptions {
	package?: string;
	arguments:
		| ManagerStateArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				baseOracle: RawTransactionArgument<string>,
				quoteOracle: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				baseMarginPool: RawTransactionArgument<string>,
				quoteMarginPool: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Returns comprehensive state information for a margin manager. Returns
 * (manager_id, deepbook_pool_id, risk_ratio, base_asset, quote_asset, base_debt,
 * quote_debt, base_pyth_price, base_pyth_decimals, quote_pyth_price,
 * quote_pyth_decimals, current_price, lowest_trigger_above_price,
 * highest_trigger_below_price)
 */
export function managerState(options: ManagerStateOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, null, null, null, null, null, '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'self',
		'registry',
		'baseOracle',
		'quoteOracle',
		'pool',
		'baseMarginPool',
		'quoteMarginPool',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'manager_state',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface IdArguments {
	self: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface OwnerArguments {
	self: RawTransactionArgument<string>;
}
export interface OwnerOptions {
	package?: string;
	arguments: OwnerArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function owner(options: OwnerOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'owner',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface DeepbookPoolArguments {
	self: RawTransactionArgument<string>;
}
export interface DeepbookPoolOptions {
	package?: string;
	arguments: DeepbookPoolArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function deepbookPool(options: DeepbookPoolOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'deepbook_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MarginPoolIdArguments {
	self: RawTransactionArgument<string>;
}
export interface MarginPoolIdOptions {
	package?: string;
	arguments: MarginPoolIdArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function marginPoolId(options: MarginPoolIdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'margin_pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowedSharesArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowedSharesOptions {
	package?: string;
	arguments: BorrowedSharesArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function borrowedShares(options: BorrowedSharesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'borrowed_shares',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowedBaseSharesArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowedBaseSharesOptions {
	package?: string;
	arguments: BorrowedBaseSharesArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function borrowedBaseShares(options: BorrowedBaseSharesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'borrowed_base_shares',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowedQuoteSharesArguments {
	self: RawTransactionArgument<string>;
}
export interface BorrowedQuoteSharesOptions {
	package?: string;
	arguments: BorrowedQuoteSharesArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function borrowedQuoteShares(options: BorrowedQuoteSharesOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'borrowed_quote_shares',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface HasBaseDebtArguments {
	self: RawTransactionArgument<string>;
}
export interface HasBaseDebtOptions {
	package?: string;
	arguments: HasBaseDebtArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function hasBaseDebt(options: HasBaseDebtOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'has_base_debt',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ConditionalOrderIdsArguments {
	self: RawTransactionArgument<string>;
}
export interface ConditionalOrderIdsOptions {
	package?: string;
	arguments: ConditionalOrderIdsArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function conditionalOrderIds(options: ConditionalOrderIdsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'conditional_order_ids',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ConditionalOrderArguments {
	self: RawTransactionArgument<string>;
	conditionalOrderId: RawTransactionArgument<number | bigint>;
}
export interface ConditionalOrderOptions {
	package?: string;
	arguments:
		| ConditionalOrderArguments
		| [
				self: RawTransactionArgument<string>,
				conditionalOrderId: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
export function conditionalOrder(options: ConditionalOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['self', 'conditionalOrderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'conditional_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LowestTriggerAbovePriceArguments {
	self: RawTransactionArgument<string>;
}
export interface LowestTriggerAbovePriceOptions {
	package?: string;
	arguments: LowestTriggerAbovePriceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Returns the lowest trigger price for trigger_above orders Returns
 * constants::max_u64() if there are no trigger_above orders
 */
export function lowestTriggerAbovePrice(options: LowestTriggerAbovePriceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'lowest_trigger_above_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface HighestTriggerBelowPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface HighestTriggerBelowPriceOptions {
	package?: string;
	arguments: HighestTriggerBelowPriceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Returns the highest trigger price for trigger_below orders Returns 0 if there
 * are no trigger_below orders
 */
export function highestTriggerBelowPrice(options: HighestTriggerBelowPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'highest_trigger_below_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetAccountOrderDetailsArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface GetAccountOrderDetailsOptions {
	package?: string;
	arguments:
		| GetAccountOrderDetailsArguments
		| [self: RawTransactionArgument<string>, pool: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function getAccountOrderDetails(options: GetAccountOrderDetailsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'get_account_order_details',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AccountOpenOrdersArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface AccountOpenOrdersOptions {
	package?: string;
	arguments:
		| AccountOpenOrdersArguments
		| [self: RawTransactionArgument<string>, pool: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function accountOpenOrders(options: AccountOpenOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'account_open_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LockedBalanceArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface LockedBalanceOptions {
	package?: string;
	arguments:
		| LockedBalanceArguments
		| [self: RawTransactionArgument<string>, pool: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function lockedBalance(options: LockedBalanceOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'locked_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BalanceManagerIdArguments {
	self: RawTransactionArgument<string>;
}
export interface BalanceManagerIdOptions {
	package?: string;
	arguments: BalanceManagerIdArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function balanceManagerId(options: BalanceManagerIdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'balance_manager_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetBalanceManagerReferralIdArguments {
	self: RawTransactionArgument<string>;
	poolId: RawTransactionArgument<string>;
}
export interface GetBalanceManagerReferralIdOptions {
	package?: string;
	arguments:
		| GetBalanceManagerReferralIdArguments
		| [self: RawTransactionArgument<string>, poolId: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function getBalanceManagerReferralId(options: GetBalanceManagerReferralIdOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, '0x2::object::ID'] satisfies (string | null)[];
	const parameterNames = ['self', 'poolId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'get_balance_manager_referral_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AccountExistsArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface AccountExistsOptions {
	package?: string;
	arguments:
		| AccountExistsArguments
		| [self: RawTransactionArgument<string>, pool: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function accountExists(options: AccountExistsOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'account_exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AccountArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
}
export interface AccountOptions {
	package?: string;
	arguments:
		| AccountArguments
		| [self: RawTransactionArgument<string>, pool: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function account(options: AccountOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'pool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'account',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CanPlaceLimitOrderArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	price: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
	expireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface CanPlaceLimitOrderOptions {
	package?: string;
	arguments:
		| CanPlaceLimitOrderArguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				price: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
				expireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
export function canPlaceLimitOrder(options: CanPlaceLimitOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [
		null,
		null,
		'u64',
		'u64',
		'bool',
		'bool',
		'u64',
		'0x2::clock::Clock',
	] satisfies (string | null)[];
	const parameterNames = [
		'self',
		'pool',
		'price',
		'quantity',
		'isBid',
		'payWithDeep',
		'expireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'can_place_limit_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CanPlaceMarketOrderArguments {
	self: RawTransactionArgument<string>;
	pool: RawTransactionArgument<string>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface CanPlaceMarketOrderOptions {
	package?: string;
	arguments:
		| CanPlaceMarketOrderArguments
		| [
				self: RawTransactionArgument<string>,
				pool: RawTransactionArgument<string>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
export function canPlaceMarketOrder(options: CanPlaceMarketOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/margin';
	const argumentsTypes = [null, null, 'u64', 'bool', 'bool', '0x2::clock::Clock'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['self', 'pool', 'quantity', 'isBid', 'payWithDeep'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'margin_manager',
			function: 'can_place_market_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
