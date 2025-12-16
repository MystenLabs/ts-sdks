/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Public-facing interface for the package. */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './deps/sui/object.js';
import * as versioned from './deps/sui/versioned.js';
import * as vec_set from './deps/sui/vec_set.js';
import * as book from './book.js';
import * as state from './state.js';
import * as vault from './vault.js';
import * as deep_price from './deep_price.js';
import * as balance from './deps/sui/balance.js';
const $moduleName = '@deepbook/core::pool';
export const Pool = new MoveStruct({
	name: `${$moduleName}::Pool`,
	fields: {
		id: object.UID,
		inner: versioned.Versioned,
	},
});
export const PoolInner = new MoveStruct({
	name: `${$moduleName}::PoolInner`,
	fields: {
		allowed_versions: vec_set.VecSet(bcs.u64()),
		pool_id: bcs.Address,
		book: book.Book,
		state: state.State,
		vault: vault.Vault,
		deep_price: deep_price.DeepPrice,
		registered_pool: bcs.bool(),
	},
});
export const PoolCreated = new MoveStruct({
	name: `${$moduleName}::PoolCreated`,
	fields: {
		pool_id: bcs.Address,
		taker_fee: bcs.u64(),
		maker_fee: bcs.u64(),
		tick_size: bcs.u64(),
		lot_size: bcs.u64(),
		min_size: bcs.u64(),
		whitelisted_pool: bcs.bool(),
		treasury_address: bcs.Address,
	},
});
export const BookParamsUpdated = new MoveStruct({
	name: `${$moduleName}::BookParamsUpdated`,
	fields: {
		pool_id: bcs.Address,
		tick_size: bcs.u64(),
		lot_size: bcs.u64(),
		min_size: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const DeepBurned = new MoveStruct({
	name: `${$moduleName}::DeepBurned`,
	fields: {
		pool_id: bcs.Address,
		deep_burned: bcs.u64(),
	},
});
export const ReferralRewards = new MoveStruct({
	name: `${$moduleName}::ReferralRewards`,
	fields: {
		multiplier: bcs.u64(),
		base: balance.Balance,
		quote: balance.Balance,
		deep: balance.Balance,
	},
});
export const ReferralClaimedEvent = new MoveStruct({
	name: `${$moduleName}::ReferralClaimedEvent`,
	fields: {
		referral_id: bcs.Address,
		owner: bcs.Address,
		base_amount: bcs.u64(),
		quote_amount: bcs.u64(),
		deep_amount: bcs.u64(),
	},
});
export const ReferralClaimed = new MoveStruct({
	name: `${$moduleName}::ReferralClaimed`,
	fields: {
		pool_id: bcs.Address,
		referral_id: bcs.Address,
		owner: bcs.Address,
		base_amount: bcs.u64(),
		quote_amount: bcs.u64(),
		deep_amount: bcs.u64(),
	},
});
export const ReferralFeeEvent = new MoveStruct({
	name: `${$moduleName}::ReferralFeeEvent`,
	fields: {
		pool_id: bcs.Address,
		referral_id: bcs.Address,
		base_fee: bcs.u64(),
		quote_fee: bcs.u64(),
		deep_fee: bcs.u64(),
	},
});
export interface CreatePermissionlessPoolArguments {
	registry: RawTransactionArgument<string>;
	tickSize: RawTransactionArgument<number | bigint>;
	lotSize: RawTransactionArgument<number | bigint>;
	minSize: RawTransactionArgument<number | bigint>;
	creationFee: RawTransactionArgument<string>;
}
export interface CreatePermissionlessPoolOptions {
	package?: string;
	arguments:
		| CreatePermissionlessPoolArguments
		| [
				registry: RawTransactionArgument<string>,
				tickSize: RawTransactionArgument<number | bigint>,
				lotSize: RawTransactionArgument<number | bigint>,
				minSize: RawTransactionArgument<number | bigint>,
				creationFee: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Create a new pool. The pool is registered in the registry. Checks are performed
 * to ensure the tick size, lot size, and min size are valid. The creation fee is
 * transferred to the treasury address. Returns the id of the pool created
 */
export function createPermissionlessPool(options: CreatePermissionlessPoolOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		'u64',
		'u64',
		'u64',
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::deep::DEEP>`,
	] satisfies string[];
	const parameterNames = ['registry', 'tickSize', 'lotSize', 'minSize', 'creationFee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'create_permissionless_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceLimitOrderArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	orderType: RawTransactionArgument<number>;
	selfMatchingOption: RawTransactionArgument<number>;
	price: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
	expireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface PlaceLimitOrderOptions {
	package?: string;
	arguments:
		| PlaceLimitOrderArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
				clientOrderId: RawTransactionArgument<number | bigint>,
				orderType: RawTransactionArgument<number>,
				selfMatchingOption: RawTransactionArgument<number>,
				price: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
				expireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Place a limit order. Quantity is in base asset terms. For current version
 * pay_with_deep must be true, so the fee will be paid with DEEP tokens.
 */
export function placeLimitOrder(options: PlaceLimitOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
		'u64',
		'u8',
		'u8',
		'u64',
		'u64',
		'bool',
		'bool',
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = [
		'self',
		'balanceManager',
		'tradeProof',
		'clientOrderId',
		'orderType',
		'selfMatchingOption',
		'price',
		'quantity',
		'isBid',
		'payWithDeep',
		'expireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'place_limit_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PlaceMarketOrderArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
	clientOrderId: RawTransactionArgument<number | bigint>;
	selfMatchingOption: RawTransactionArgument<number>;
	quantity: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface PlaceMarketOrderOptions {
	package?: string;
	arguments:
		| PlaceMarketOrderArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
				clientOrderId: RawTransactionArgument<number | bigint>,
				selfMatchingOption: RawTransactionArgument<number>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/**
 * Place a market order. Quantity is in base asset terms. Calls place_limit_order
 * with a price of MAX_PRICE for bids and MIN_PRICE for asks. Any quantity not
 * filled is cancelled.
 */
export function placeMarketOrder(options: PlaceMarketOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
		'u64',
		'u8',
		'u64',
		'bool',
		'bool',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = [
		'self',
		'balanceManager',
		'tradeProof',
		'clientOrderId',
		'selfMatchingOption',
		'quantity',
		'isBid',
		'payWithDeep',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'place_market_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapExactBaseForQuoteArguments {
	self: RawTransactionArgument<string>;
	baseIn: RawTransactionArgument<string>;
	deepIn: RawTransactionArgument<string>;
	minQuoteOut: RawTransactionArgument<number | bigint>;
}
export interface SwapExactBaseForQuoteOptions {
	package?: string;
	arguments:
		| SwapExactBaseForQuoteArguments
		| [
				self: RawTransactionArgument<string>,
				baseIn: RawTransactionArgument<string>,
				deepIn: RawTransactionArgument<string>,
				minQuoteOut: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Swap exact base quantity without needing a `balance_manager`. DEEP quantity can
 * be overestimated. Returns three `Coin` objects: base, quote, and deep. Some base
 * quantity may be left over, if the input quantity is not divisible by lot size.
 */
export function swapExactBaseForQuote(options: SwapExactBaseForQuoteOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::deep::DEEP>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'baseIn', 'deepIn', 'minQuoteOut'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'swap_exact_base_for_quote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapExactBaseForQuoteWithManagerArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeCap: RawTransactionArgument<string>;
	depositCap: RawTransactionArgument<string>;
	withdrawCap: RawTransactionArgument<string>;
	baseIn: RawTransactionArgument<string>;
	minQuoteOut: RawTransactionArgument<number | bigint>;
}
export interface SwapExactBaseForQuoteWithManagerOptions {
	package?: string;
	arguments:
		| SwapExactBaseForQuoteWithManagerArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeCap: RawTransactionArgument<string>,
				depositCap: RawTransactionArgument<string>,
				withdrawCap: RawTransactionArgument<string>,
				baseIn: RawTransactionArgument<string>,
				minQuoteOut: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Swap exact base for quote with a `balance_manager`. Assumes fees are paid in
 * DEEP. Assumes balance manager has enough DEEP for fees.
 */
export function swapExactBaseForQuoteWithManager(options: SwapExactBaseForQuoteWithManagerOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeCap`,
		`${packageAddress}::balance_manager::DepositCap`,
		`${packageAddress}::balance_manager::WithdrawCap`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = [
		'self',
		'balanceManager',
		'tradeCap',
		'depositCap',
		'withdrawCap',
		'baseIn',
		'minQuoteOut',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'swap_exact_base_for_quote_with_manager',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapExactQuoteForBaseArguments {
	self: RawTransactionArgument<string>;
	quoteIn: RawTransactionArgument<string>;
	deepIn: RawTransactionArgument<string>;
	minBaseOut: RawTransactionArgument<number | bigint>;
}
export interface SwapExactQuoteForBaseOptions {
	package?: string;
	arguments:
		| SwapExactQuoteForBaseArguments
		| [
				self: RawTransactionArgument<string>,
				quoteIn: RawTransactionArgument<string>,
				deepIn: RawTransactionArgument<string>,
				minBaseOut: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Swap exact quote quantity without needing a `balance_manager`. DEEP quantity can
 * be overestimated. Returns three `Coin` objects: base, quote, and deep. Some
 * quote quantity may be left over if the input quantity is not divisible by lot
 * size.
 */
export function swapExactQuoteForBase(options: SwapExactQuoteForBaseOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[1]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::deep::DEEP>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'quoteIn', 'deepIn', 'minBaseOut'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'swap_exact_quote_for_base',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapExactQuoteForBaseWithManagerArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeCap: RawTransactionArgument<string>;
	depositCap: RawTransactionArgument<string>;
	withdrawCap: RawTransactionArgument<string>;
	quoteIn: RawTransactionArgument<string>;
	minBaseOut: RawTransactionArgument<number | bigint>;
}
export interface SwapExactQuoteForBaseWithManagerOptions {
	package?: string;
	arguments:
		| SwapExactQuoteForBaseWithManagerArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeCap: RawTransactionArgument<string>,
				depositCap: RawTransactionArgument<string>,
				withdrawCap: RawTransactionArgument<string>,
				quoteIn: RawTransactionArgument<string>,
				minBaseOut: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Swap exact quote for base with a `balance_manager`. Assumes fees are paid in
 * DEEP. Assumes balance manager has enough DEEP for fees.
 */
export function swapExactQuoteForBaseWithManager(options: SwapExactQuoteForBaseWithManagerOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeCap`,
		`${packageAddress}::balance_manager::DepositCap`,
		`${packageAddress}::balance_manager::WithdrawCap`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[1]}>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = [
		'self',
		'balanceManager',
		'tradeCap',
		'depositCap',
		'withdrawCap',
		'quoteIn',
		'minBaseOut',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'swap_exact_quote_for_base_with_manager',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapExactQuantityArguments {
	self: RawTransactionArgument<string>;
	baseIn: RawTransactionArgument<string>;
	quoteIn: RawTransactionArgument<string>;
	deepIn: RawTransactionArgument<string>;
	minOut: RawTransactionArgument<number | bigint>;
}
export interface SwapExactQuantityOptions {
	package?: string;
	arguments:
		| SwapExactQuantityArguments
		| [
				self: RawTransactionArgument<string>,
				baseIn: RawTransactionArgument<string>,
				quoteIn: RawTransactionArgument<string>,
				deepIn: RawTransactionArgument<string>,
				minOut: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Swap exact quantity without needing a balance_manager. */
export function swapExactQuantity(options: SwapExactQuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[1]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${packageAddress}::deep::DEEP>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'baseIn', 'quoteIn', 'deepIn', 'minOut'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'swap_exact_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SwapExactQuantityWithManagerArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeCap: RawTransactionArgument<string>;
	depositCap: RawTransactionArgument<string>;
	withdrawCap: RawTransactionArgument<string>;
	baseIn: RawTransactionArgument<string>;
	quoteIn: RawTransactionArgument<string>;
	minOut: RawTransactionArgument<number | bigint>;
}
export interface SwapExactQuantityWithManagerOptions {
	package?: string;
	arguments:
		| SwapExactQuantityWithManagerArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeCap: RawTransactionArgument<string>,
				depositCap: RawTransactionArgument<string>,
				withdrawCap: RawTransactionArgument<string>,
				baseIn: RawTransactionArgument<string>,
				quoteIn: RawTransactionArgument<string>,
				minOut: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Swap exact quantity with a `balance_manager`. Assumes fees are paid in DEEP.
 * Assumes balance manager has enough DEEP for fees.
 */
export function swapExactQuantityWithManager(options: SwapExactQuantityWithManagerOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeCap`,
		`${packageAddress}::balance_manager::DepositCap`,
		`${packageAddress}::balance_manager::WithdrawCap`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[1]}>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = [
		'self',
		'balanceManager',
		'tradeCap',
		'depositCap',
		'withdrawCap',
		'baseIn',
		'quoteIn',
		'minOut',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'swap_exact_quantity_with_manager',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ModifyOrderArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
	newQuantity: RawTransactionArgument<number | bigint>;
}
export interface ModifyOrderOptions {
	package?: string;
	arguments:
		| ModifyOrderArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
				orderId: RawTransactionArgument<number | bigint>,
				newQuantity: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Modifies an order given order_id and new_quantity. New quantity must be less
 * than the original quantity and more than the filled quantity. Order must not
 * have already expired.
 */
export function modifyOrder(options: ModifyOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
		'u128',
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'tradeProof', 'orderId', 'newQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'modify_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelOrderArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface CancelOrderOptions {
	package?: string;
	arguments:
		| CancelOrderArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
				orderId: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Cancel an order. The order must be owned by the balance_manager. The order is
 * removed from the book and the balance_manager's open orders. The
 * balance_manager's balance is updated with the order's remaining quantity. Order
 * canceled event is emitted.
 */
export function cancelOrder(options: CancelOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
		'u128',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'tradeProof', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'cancel_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelOrdersArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
	orderIds: RawTransactionArgument<number | bigint[]>;
}
export interface CancelOrdersOptions {
	package?: string;
	arguments:
		| CancelOrdersArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
				orderIds: RawTransactionArgument<number | bigint[]>,
		  ];
	typeArguments: [string, string];
}
/**
 * Cancel multiple orders within a vector. The orders must be owned by the
 * balance_manager. The orders are removed from the book and the balance_manager's
 * open orders. Order canceled events are emitted. If any order fails to cancel, no
 * orders will be cancelled.
 */
export function cancelOrders(options: CancelOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
		'vector<u128>',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'tradeProof', 'orderIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'cancel_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CancelAllOrdersArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
}
export interface CancelAllOrdersOptions {
	package?: string;
	arguments:
		| CancelAllOrdersArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Cancel all open orders placed by the balance manager in the pool. */
export function cancelAllOrders(options: CancelAllOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'tradeProof'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'cancel_all_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawSettledAmountsArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
}
export interface WithdrawSettledAmountsOptions {
	package?: string;
	arguments:
		| WithdrawSettledAmountsArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Withdraw settled amounts to the `balance_manager`. */
export function withdrawSettledAmounts(options: WithdrawSettledAmountsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'tradeProof'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'withdraw_settled_amounts',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WithdrawSettledAmountsPermissionlessArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
}
export interface WithdrawSettledAmountsPermissionlessOptions {
	package?: string;
	arguments:
		| WithdrawSettledAmountsPermissionlessArguments
		| [self: RawTransactionArgument<string>, balanceManager: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Withdraw settled amounts permissionlessly to the `balance_manager`. */
export function withdrawSettledAmountsPermissionless(
	options: WithdrawSettledAmountsPermissionlessOptions,
) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'withdraw_settled_amounts_permissionless',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface StakeArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface StakeOptions {
	package?: string;
	arguments:
		| StakeArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
				amount: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Stake DEEP tokens to the pool. The balance_manager must have enough DEEP tokens.
 * The balance_manager's data is updated with the staked amount.
 */
export function stake(options: StakeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'tradeProof', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'stake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UnstakeArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
}
export interface UnstakeOptions {
	package?: string;
	arguments:
		| UnstakeArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Unstake DEEP tokens from the pool. The balance_manager must have enough staked
 * DEEP tokens. The balance_manager's data is updated with the unstaked amount.
 * Balance is transferred to the balance_manager immediately.
 */
export function unstake(options: UnstakeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'tradeProof'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'unstake',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SubmitProposalArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
	takerFee: RawTransactionArgument<number | bigint>;
	makerFee: RawTransactionArgument<number | bigint>;
	stakeRequired: RawTransactionArgument<number | bigint>;
}
export interface SubmitProposalOptions {
	package?: string;
	arguments:
		| SubmitProposalArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
				takerFee: RawTransactionArgument<number | bigint>,
				makerFee: RawTransactionArgument<number | bigint>,
				stakeRequired: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Submit a proposal to change the taker fee, maker fee, and stake required. The
 * balance_manager must have enough staked DEEP tokens to participate. Each
 * balance_manager can only submit one proposal per epoch. If the maximum proposal
 * is reached, the proposal with the lowest vote is removed. If the balance_manager
 * has less voting power than the lowest voted proposal, the proposal is not added.
 */
export function submitProposal(options: SubmitProposalOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
		'u64',
		'u64',
		'u64',
	] satisfies string[];
	const parameterNames = [
		'self',
		'balanceManager',
		'tradeProof',
		'takerFee',
		'makerFee',
		'stakeRequired',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'submit_proposal',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface VoteArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
	proposalId: RawTransactionArgument<string>;
}
export interface VoteOptions {
	package?: string;
	arguments:
		| VoteArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
				proposalId: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Vote on a proposal. The balance_manager must have enough staked DEEP tokens to
 * participate. Full voting power of the balance_manager is used. Voting for a new
 * proposal will remove the vote from the previous proposal.
 */
export function vote(options: VoteOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::ID',
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'tradeProof', 'proposalId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'vote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ClaimRebatesArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
	tradeProof: RawTransactionArgument<string>;
}
export interface ClaimRebatesOptions {
	package?: string;
	arguments:
		| ClaimRebatesArguments
		| [
				self: RawTransactionArgument<string>,
				balanceManager: RawTransactionArgument<string>,
				tradeProof: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Claim the rewards for the balance_manager. The balance_manager must have rewards
 * to claim. The balance_manager's data is updated with the claimed rewards.
 */
export function claimRebates(options: ClaimRebatesOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		`${packageAddress}::balance_manager::TradeProof`,
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'tradeProof'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'claim_rebates',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowFlashloanBaseArguments {
	self: RawTransactionArgument<string>;
	baseAmount: RawTransactionArgument<number | bigint>;
}
export interface BorrowFlashloanBaseOptions {
	package?: string;
	arguments:
		| BorrowFlashloanBaseArguments
		| [self: RawTransactionArgument<string>, baseAmount: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/**
 * Borrow base assets from the Pool. A hot potato is returned, forcing the borrower
 * to return the assets within the same transaction.
 */
export function borrowFlashloanBase(options: BorrowFlashloanBaseOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'baseAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'borrow_flashloan_base',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BorrowFlashloanQuoteArguments {
	self: RawTransactionArgument<string>;
	quoteAmount: RawTransactionArgument<number | bigint>;
}
export interface BorrowFlashloanQuoteOptions {
	package?: string;
	arguments:
		| BorrowFlashloanQuoteArguments
		| [self: RawTransactionArgument<string>, quoteAmount: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/**
 * Borrow quote assets from the Pool. A hot potato is returned, forcing the
 * borrower to return the assets within the same transaction.
 */
export function borrowFlashloanQuote(options: BorrowFlashloanQuoteOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'quoteAmount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'borrow_flashloan_quote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReturnFlashloanBaseArguments {
	self: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
	flashLoan: RawTransactionArgument<string>;
}
export interface ReturnFlashloanBaseOptions {
	package?: string;
	arguments:
		| ReturnFlashloanBaseArguments
		| [
				self: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
				flashLoan: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Return the flashloaned base assets to the Pool. FlashLoan object will only be
 * unwrapped if the assets are returned, otherwise the transaction will fail.
 */
export function returnFlashloanBase(options: ReturnFlashloanBaseOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[0]}>`,
		`${packageAddress}::vault::FlashLoan`,
	] satisfies string[];
	const parameterNames = ['self', 'coin', 'flashLoan'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'return_flashloan_base',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ReturnFlashloanQuoteArguments {
	self: RawTransactionArgument<string>;
	coin: RawTransactionArgument<string>;
	flashLoan: RawTransactionArgument<string>;
}
export interface ReturnFlashloanQuoteOptions {
	package?: string;
	arguments:
		| ReturnFlashloanQuoteArguments
		| [
				self: RawTransactionArgument<string>,
				coin: RawTransactionArgument<string>,
				flashLoan: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Return the flashloaned quote assets to the Pool. FlashLoan object will only be
 * unwrapped if the assets are returned, otherwise the transaction will fail.
 */
export function returnFlashloanQuote(options: ReturnFlashloanQuoteOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<${options.typeArguments[1]}>`,
		`${packageAddress}::vault::FlashLoan`,
	] satisfies string[];
	const parameterNames = ['self', 'coin', 'flashLoan'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'return_flashloan_quote',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AddDeepPricePointArguments {
	targetPool: RawTransactionArgument<string>;
	referencePool: RawTransactionArgument<string>;
}
export interface AddDeepPricePointOptions {
	package?: string;
	arguments:
		| AddDeepPricePointArguments
		| [targetPool: RawTransactionArgument<string>, referencePool: RawTransactionArgument<string>];
	typeArguments: [string, string, string, string];
}
/**
 * Adds a price point along with a timestamp to the deep price. Allows for the
 * calculation of deep price per base asset.
 */
export function addDeepPricePoint(options: AddDeepPricePointOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::pool::Pool<${options.typeArguments[2]}, ${options.typeArguments[3]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['targetPool', 'referencePool'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'add_deep_price_point',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface BurnDeepArguments {
	self: RawTransactionArgument<string>;
	treasuryCap: RawTransactionArgument<string>;
}
export interface BurnDeepOptions {
	package?: string;
	arguments:
		| BurnDeepArguments
		| [self: RawTransactionArgument<string>, treasuryCap: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Burns DEEP tokens from the pool. Amount to burn is within history */
export function burnDeep(options: BurnDeepOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::deep::ProtectedTreasury`,
	] satisfies string[];
	const parameterNames = ['self', 'treasuryCap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'burn_deep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MintReferralArguments {
	self: RawTransactionArgument<string>;
	multiplier: RawTransactionArgument<number | bigint>;
}
export interface MintReferralOptions {
	package?: string;
	arguments:
		| MintReferralArguments
		| [self: RawTransactionArgument<string>, multiplier: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/** Mint a DeepBookReferral and set the additional bps for the referral. */
export function mintReferral(options: MintReferralOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'multiplier'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'mint_referral',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateReferralMultiplierArguments {
	Self: RawTransactionArgument<string>;
	Referral: RawTransactionArgument<string>;
	Multiplier: RawTransactionArgument<number | bigint>;
}
export interface UpdateReferralMultiplierOptions {
	package?: string;
	arguments:
		| UpdateReferralMultiplierArguments
		| [
				Self: RawTransactionArgument<string>,
				Referral: RawTransactionArgument<string>,
				Multiplier: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
export function updateReferralMultiplier(options: UpdateReferralMultiplierOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::DeepBookReferral`,
		'u64',
	] satisfies string[];
	const parameterNames = ['Self', 'Referral', 'Multiplier'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'update_referral_multiplier',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateDeepbookReferralMultiplierArguments {
	self: RawTransactionArgument<string>;
	referral: RawTransactionArgument<string>;
	multiplier: RawTransactionArgument<number | bigint>;
}
export interface UpdateDeepbookReferralMultiplierOptions {
	package?: string;
	arguments:
		| UpdateDeepbookReferralMultiplierArguments
		| [
				self: RawTransactionArgument<string>,
				referral: RawTransactionArgument<string>,
				multiplier: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Update the multiplier for the referral. */
export function updateDeepbookReferralMultiplier(options: UpdateDeepbookReferralMultiplierOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::DeepBookReferral`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'referral', 'multiplier'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'update_deepbook_referral_multiplier',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface ClaimReferralRewardsArguments {
	self: RawTransactionArgument<string>;
	referral: RawTransactionArgument<string>;
}
export interface ClaimReferralRewardsOptions {
	package?: string;
	arguments:
		| ClaimReferralRewardsArguments
		| [self: RawTransactionArgument<string>, referral: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Claim the rewards for the referral. */
export function claimReferralRewards(options: ClaimReferralRewardsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::DeepBookReferral`,
	] satisfies string[];
	const parameterNames = ['self', 'referral'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'claim_referral_rewards',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CreatePoolAdminArguments {
	registry: RawTransactionArgument<string>;
	tickSize: RawTransactionArgument<number | bigint>;
	lotSize: RawTransactionArgument<number | bigint>;
	minSize: RawTransactionArgument<number | bigint>;
	whitelistedPool: RawTransactionArgument<boolean>;
	stablePool: RawTransactionArgument<boolean>;
	Cap: RawTransactionArgument<string>;
}
export interface CreatePoolAdminOptions {
	package?: string;
	arguments:
		| CreatePoolAdminArguments
		| [
				registry: RawTransactionArgument<string>,
				tickSize: RawTransactionArgument<number | bigint>,
				lotSize: RawTransactionArgument<number | bigint>,
				minSize: RawTransactionArgument<number | bigint>,
				whitelistedPool: RawTransactionArgument<boolean>,
				stablePool: RawTransactionArgument<boolean>,
				Cap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Create a new pool. The pool is registered in the registry. Checks are performed
 * to ensure the tick size, lot size, and min size are valid. Returns the id of the
 * pool created
 */
export function createPoolAdmin(options: CreatePoolAdminOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::registry::Registry`,
		'u64',
		'u64',
		'u64',
		'bool',
		'bool',
		`${packageAddress}::registry::DeepbookAdminCap`,
	] satisfies string[];
	const parameterNames = [
		'registry',
		'tickSize',
		'lotSize',
		'minSize',
		'whitelistedPool',
		'stablePool',
		'Cap',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'create_pool_admin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UnregisterPoolAdminArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface UnregisterPoolAdminOptions {
	package?: string;
	arguments:
		| UnregisterPoolAdminArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				Cap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Unregister a pool in case it needs to be redeployed. */
export function unregisterPoolAdmin(options: UnregisterPoolAdminOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::registry::DeepbookAdminCap`,
	] satisfies string[];
	const parameterNames = ['self', 'registry', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'unregister_pool_admin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdateAllowedVersionsArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
}
export interface UpdateAllowedVersionsOptions {
	package?: string;
	arguments:
		| UpdateAllowedVersionsArguments
		| [
				self: RawTransactionArgument<string>,
				registry: RawTransactionArgument<string>,
				Cap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Takes the registry and updates the allowed version within pool Only admin can
 * update the allowed versions This function does not have version restrictions
 */
export function updateAllowedVersions(options: UpdateAllowedVersionsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::registry::Registry`,
		`${packageAddress}::registry::DeepbookAdminCap`,
	] satisfies string[];
	const parameterNames = ['self', 'registry', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'update_allowed_versions',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface UpdatePoolAllowedVersionsArguments {
	self: RawTransactionArgument<string>;
	registry: RawTransactionArgument<string>;
}
export interface UpdatePoolAllowedVersionsOptions {
	package?: string;
	arguments:
		| UpdatePoolAllowedVersionsArguments
		| [self: RawTransactionArgument<string>, registry: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Takes the registry and updates the allowed version within pool Permissionless
 * equivalent of `update_allowed_versions` This function does not have version
 * restrictions
 */
export function updatePoolAllowedVersions(options: UpdatePoolAllowedVersionsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::registry::Registry`,
	] satisfies string[];
	const parameterNames = ['self', 'registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'update_pool_allowed_versions',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AdjustTickSizeAdminArguments {
	self: RawTransactionArgument<string>;
	newTickSize: RawTransactionArgument<number | bigint>;
	Cap: RawTransactionArgument<string>;
}
export interface AdjustTickSizeAdminOptions {
	package?: string;
	arguments:
		| AdjustTickSizeAdminArguments
		| [
				self: RawTransactionArgument<string>,
				newTickSize: RawTransactionArgument<number | bigint>,
				Cap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/** Adjust the tick size of the pool. Only admin can adjust the tick size. */
export function adjustTickSizeAdmin(options: AdjustTickSizeAdminOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		`${packageAddress}::registry::DeepbookAdminCap`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'newTickSize', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'adjust_tick_size_admin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AdjustMinLotSizeAdminArguments {
	self: RawTransactionArgument<string>;
	newLotSize: RawTransactionArgument<number | bigint>;
	newMinSize: RawTransactionArgument<number | bigint>;
	Cap: RawTransactionArgument<string>;
}
export interface AdjustMinLotSizeAdminOptions {
	package?: string;
	arguments:
		| AdjustMinLotSizeAdminArguments
		| [
				self: RawTransactionArgument<string>,
				newLotSize: RawTransactionArgument<number | bigint>,
				newMinSize: RawTransactionArgument<number | bigint>,
				Cap: RawTransactionArgument<string>,
		  ];
	typeArguments: [string, string];
}
/**
 * Adjust and lot size and min size of the pool. New lot size must be smaller than
 * current lot size. Only admin can adjust the min size and lot size.
 */
export function adjustMinLotSizeAdmin(options: AdjustMinLotSizeAdminOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'u64',
		`${packageAddress}::registry::DeepbookAdminCap`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'newLotSize', 'newMinSize', 'Cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'adjust_min_lot_size_admin',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface EnableEwmaStateArguments {
	self: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
	enable: RawTransactionArgument<boolean>;
}
export interface EnableEwmaStateOptions {
	package?: string;
	arguments:
		| EnableEwmaStateArguments
		| [
				self: RawTransactionArgument<string>,
				Cap: RawTransactionArgument<string>,
				enable: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/**
 * Enable the EWMA state for the pool. This allows the pool to use the EWMA state
 * for volatility calculations and additional taker fees.
 */
export function enableEwmaState(options: EnableEwmaStateOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::registry::DeepbookAdminCap`,
		'bool',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'Cap', 'enable'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'enable_ewma_state',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface SetEwmaParamsArguments {
	self: RawTransactionArgument<string>;
	Cap: RawTransactionArgument<string>;
	alpha: RawTransactionArgument<number | bigint>;
	zScoreThreshold: RawTransactionArgument<number | bigint>;
	additionalTakerFee: RawTransactionArgument<number | bigint>;
}
export interface SetEwmaParamsOptions {
	package?: string;
	arguments:
		| SetEwmaParamsArguments
		| [
				self: RawTransactionArgument<string>,
				Cap: RawTransactionArgument<string>,
				alpha: RawTransactionArgument<number | bigint>,
				zScoreThreshold: RawTransactionArgument<number | bigint>,
				additionalTakerFee: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/** Set the EWMA parameters for the pool. Only admin can set the parameters. */
export function setEwmaParams(options: SetEwmaParamsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::registry::DeepbookAdminCap`,
		'u64',
		'u64',
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'Cap', 'alpha', 'zScoreThreshold', 'additionalTakerFee'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'set_ewma_params',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface WhitelistedArguments {
	self: RawTransactionArgument<string>;
}
export interface WhitelistedOptions {
	package?: string;
	arguments: WhitelistedArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Accessor to check if the pool is whitelisted. */
export function whitelisted(options: WhitelistedOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'whitelisted',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface StablePoolArguments {
	self: RawTransactionArgument<string>;
}
export interface StablePoolOptions {
	package?: string;
	arguments: StablePoolArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Accessor to check if the pool is a stablecoin pool. */
export function stablePool(options: StablePoolOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'stable_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface RegisteredPoolArguments {
	self: RawTransactionArgument<string>;
}
export interface RegisteredPoolOptions {
	package?: string;
	arguments: RegisteredPoolArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function registeredPool(options: RegisteredPoolOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'registered_pool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetQuoteQuantityOutArguments {
	self: RawTransactionArgument<string>;
	baseQuantity: RawTransactionArgument<number | bigint>;
}
export interface GetQuoteQuantityOutOptions {
	package?: string;
	arguments:
		| GetQuoteQuantityOutArguments
		| [self: RawTransactionArgument<string>, baseQuantity: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/**
 * Dry run to determine the quote quantity out for a given base quantity. Uses DEEP
 * token as fee.
 */
export function getQuoteQuantityOut(options: GetQuoteQuantityOutOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'baseQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_quote_quantity_out',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetBaseQuantityOutArguments {
	self: RawTransactionArgument<string>;
	quoteQuantity: RawTransactionArgument<number | bigint>;
}
export interface GetBaseQuantityOutOptions {
	package?: string;
	arguments:
		| GetBaseQuantityOutArguments
		| [
				self: RawTransactionArgument<string>,
				quoteQuantity: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Dry run to determine the base quantity out for a given quote quantity. Uses DEEP
 * token as fee.
 */
export function getBaseQuantityOut(options: GetBaseQuantityOutOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'quoteQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_base_quantity_out',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetQuoteQuantityOutInputFeeArguments {
	self: RawTransactionArgument<string>;
	baseQuantity: RawTransactionArgument<number | bigint>;
}
export interface GetQuoteQuantityOutInputFeeOptions {
	package?: string;
	arguments:
		| GetQuoteQuantityOutInputFeeArguments
		| [self: RawTransactionArgument<string>, baseQuantity: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/**
 * Dry run to determine the quote quantity out for a given base quantity. Uses
 * input token as fee.
 */
export function getQuoteQuantityOutInputFee(options: GetQuoteQuantityOutInputFeeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'baseQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_quote_quantity_out_input_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetBaseQuantityOutInputFeeArguments {
	self: RawTransactionArgument<string>;
	quoteQuantity: RawTransactionArgument<number | bigint>;
}
export interface GetBaseQuantityOutInputFeeOptions {
	package?: string;
	arguments:
		| GetBaseQuantityOutInputFeeArguments
		| [
				self: RawTransactionArgument<string>,
				quoteQuantity: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Dry run to determine the base quantity out for a given quote quantity. Uses
 * input token as fee.
 */
export function getBaseQuantityOutInputFee(options: GetBaseQuantityOutInputFeeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'quoteQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_base_quantity_out_input_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetQuantityOutArguments {
	self: RawTransactionArgument<string>;
	baseQuantity: RawTransactionArgument<number | bigint>;
	quoteQuantity: RawTransactionArgument<number | bigint>;
}
export interface GetQuantityOutOptions {
	package?: string;
	arguments:
		| GetQuantityOutArguments
		| [
				self: RawTransactionArgument<string>,
				baseQuantity: RawTransactionArgument<number | bigint>,
				quoteQuantity: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Dry run to determine the quantity out for a given base or quote quantity. Only
 * one out of base or quote quantity should be non-zero. Returns the
 * (base_quantity_out, quote_quantity_out, deep_quantity_required) Uses DEEP token
 * as fee.
 */
export function getQuantityOut(options: GetQuantityOutOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'baseQuantity', 'quoteQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_quantity_out',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetQuantityOutInputFeeArguments {
	self: RawTransactionArgument<string>;
	baseQuantity: RawTransactionArgument<number | bigint>;
	quoteQuantity: RawTransactionArgument<number | bigint>;
}
export interface GetQuantityOutInputFeeOptions {
	package?: string;
	arguments:
		| GetQuantityOutInputFeeArguments
		| [
				self: RawTransactionArgument<string>,
				baseQuantity: RawTransactionArgument<number | bigint>,
				quoteQuantity: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Dry run to determine the quantity out for a given base or quote quantity. Only
 * one out of base or quote quantity should be non-zero. Returns the
 * (base_quantity_out, quote_quantity_out, deep_quantity_required) Uses input token
 * as fee.
 */
export function getQuantityOutInputFee(options: GetQuantityOutInputFeeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'baseQuantity', 'quoteQuantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_quantity_out_input_fee',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetBaseQuantityInArguments {
	self: RawTransactionArgument<string>;
	targetQuoteQuantity: RawTransactionArgument<number | bigint>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface GetBaseQuantityInOptions {
	package?: string;
	arguments:
		| GetBaseQuantityInArguments
		| [
				self: RawTransactionArgument<string>,
				targetQuoteQuantity: RawTransactionArgument<number | bigint>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/**
 * Dry run to determine the base quantity needed to sell to receive a target quote
 * quantity. Returns (base_quantity_in, actual_quote_quantity_out,
 * deep_quantity_required) Returns (0, 0, 0) if insufficient liquidity or if result
 * would be below min_size.
 */
export function getBaseQuantityIn(options: GetBaseQuantityInOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'bool',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'targetQuoteQuantity', 'payWithDeep'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_base_quantity_in',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetQuoteQuantityInArguments {
	self: RawTransactionArgument<string>;
	targetBaseQuantity: RawTransactionArgument<number | bigint>;
	payWithDeep: RawTransactionArgument<boolean>;
}
export interface GetQuoteQuantityInOptions {
	package?: string;
	arguments:
		| GetQuoteQuantityInArguments
		| [
				self: RawTransactionArgument<string>,
				targetBaseQuantity: RawTransactionArgument<number | bigint>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/**
 * Dry run to determine the quote quantity needed to buy a target base quantity.
 * Returns (actual_base_quantity_out, quote_quantity_in, deep_quantity_required)
 * Returns (0, 0, 0) if insufficient liquidity or if result would be below
 * min_size.
 */
export function getQuoteQuantityIn(options: GetQuoteQuantityInOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'bool',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'targetBaseQuantity', 'payWithDeep'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_quote_quantity_in',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface MidPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface MidPriceOptions {
	package?: string;
	arguments: MidPriceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Returns the mid price of the pool. */
export function midPrice(options: MidPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'mid_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AccountOpenOrdersArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
}
export interface AccountOpenOrdersOptions {
	package?: string;
	arguments:
		| AccountOpenOrdersArguments
		| [self: RawTransactionArgument<string>, balanceManager: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Returns the order_id for all open order for the balance_manager in the pool. */
export function accountOpenOrders(options: AccountOpenOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'account_open_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetLevel2RangeArguments {
	self: RawTransactionArgument<string>;
	priceLow: RawTransactionArgument<number | bigint>;
	priceHigh: RawTransactionArgument<number | bigint>;
	isBid: RawTransactionArgument<boolean>;
}
export interface GetLevel2RangeOptions {
	package?: string;
	arguments:
		| GetLevel2RangeArguments
		| [
				self: RawTransactionArgument<string>,
				priceLow: RawTransactionArgument<number | bigint>,
				priceHigh: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/**
 * Returns the (price_vec, quantity_vec) for the level2 order book. The price_low
 * and price_high are inclusive, all orders within the range are returned. is_bid
 * is true for bids and false for asks.
 */
export function getLevel2Range(options: GetLevel2RangeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'u64',
		'bool',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'priceLow', 'priceHigh', 'isBid'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_level2_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetLevel2TicksFromMidArguments {
	self: RawTransactionArgument<string>;
	ticks: RawTransactionArgument<number | bigint>;
}
export interface GetLevel2TicksFromMidOptions {
	package?: string;
	arguments:
		| GetLevel2TicksFromMidArguments
		| [self: RawTransactionArgument<string>, ticks: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/**
 * Returns the (price_vec, quantity_vec) for the level2 order book. Ticks are the
 * maximum number of ticks to return starting from best bid and best ask.
 * (bid_price, bid_quantity, ask_price, ask_quantity) are returned as 4 vectors.
 * The price vectors are sorted in descending order for bids and ascending order
 * for asks.
 */
export function getLevel2TicksFromMid(options: GetLevel2TicksFromMidOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'ticks'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_level2_ticks_from_mid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface VaultBalancesArguments {
	self: RawTransactionArgument<string>;
}
export interface VaultBalancesOptions {
	package?: string;
	arguments: VaultBalancesArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Get all balances held in this pool. */
export function vaultBalances(options: VaultBalancesOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'vault_balances',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetPoolIdByAssetArguments {
	registry: RawTransactionArgument<string>;
}
export interface GetPoolIdByAssetOptions {
	package?: string;
	arguments: GetPoolIdByAssetArguments | [registry: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Get the ID of the pool given the asset types. */
export function getPoolIdByAsset(options: GetPoolIdByAssetOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::registry::Registry`] satisfies string[];
	const parameterNames = ['registry'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_pool_id_by_asset',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetOrderArguments {
	self: RawTransactionArgument<string>;
	orderId: RawTransactionArgument<number | bigint>;
}
export interface GetOrderOptions {
	package?: string;
	arguments:
		| GetOrderArguments
		| [self: RawTransactionArgument<string>, orderId: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/** Get the Order struct */
export function getOrder(options: GetOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u128',
	] satisfies string[];
	const parameterNames = ['self', 'orderId'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetOrdersArguments {
	self: RawTransactionArgument<string>;
	orderIds: RawTransactionArgument<number | bigint[]>;
}
export interface GetOrdersOptions {
	package?: string;
	arguments:
		| GetOrdersArguments
		| [self: RawTransactionArgument<string>, orderIds: RawTransactionArgument<number | bigint[]>];
	typeArguments: [string, string];
}
/** Get multiple orders given a vector of order_ids. */
export function getOrders(options: GetOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'vector<u128>',
	] satisfies string[];
	const parameterNames = ['self', 'orderIds'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetAccountOrderDetailsArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
}
export interface GetAccountOrderDetailsOptions {
	package?: string;
	arguments:
		| GetAccountOrderDetailsArguments
		| [self: RawTransactionArgument<string>, balanceManager: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Return a copy of all orders that are in the book for this account. */
export function getAccountOrderDetails(options: GetAccountOrderDetailsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_account_order_details',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetOrderDeepPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface GetOrderDeepPriceOptions {
	package?: string;
	arguments: GetOrderDeepPriceArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Return the DEEP price for the pool. */
export function getOrderDeepPrice(options: GetOrderDeepPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_order_deep_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetOrderDeepRequiredArguments {
	self: RawTransactionArgument<string>;
	baseQuantity: RawTransactionArgument<number | bigint>;
	price: RawTransactionArgument<number | bigint>;
}
export interface GetOrderDeepRequiredOptions {
	package?: string;
	arguments:
		| GetOrderDeepRequiredArguments
		| [
				self: RawTransactionArgument<string>,
				baseQuantity: RawTransactionArgument<number | bigint>,
				price: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Returns the deep required for an order if it's taker or maker given quantity and
 * price Does not account for discounted taker fees Returns (deep_required_taker,
 * deep_required_maker)
 */
export function getOrderDeepRequired(options: GetOrderDeepRequiredOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'baseQuantity', 'price'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_order_deep_required',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface LockedBalanceArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
}
export interface LockedBalanceOptions {
	package?: string;
	arguments:
		| LockedBalanceArguments
		| [self: RawTransactionArgument<string>, balanceManager: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Returns the locked balance for the balance_manager in the pool Returns
 * (base_quantity, quote_quantity, deep_quantity)
 */
export function lockedBalance(options: LockedBalanceOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'locked_balance',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CanPlaceLimitOrderArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
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
				balanceManager: RawTransactionArgument<string>,
				price: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
				expireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Check if a limit order can be placed based on balance manager balances. Returns
 * true if the balance manager has sufficient balance (accounting for fees) to
 * place the order, false otherwise. Assumes the limit order is a taker order as a
 * worst case scenario.
 */
export function canPlaceLimitOrder(options: CanPlaceLimitOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		'u64',
		'u64',
		'bool',
		'bool',
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = [
		'self',
		'balanceManager',
		'price',
		'quantity',
		'isBid',
		'payWithDeep',
		'expireTimestamp',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'can_place_limit_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CanPlaceMarketOrderArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
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
				balanceManager: RawTransactionArgument<string>,
				quantity: RawTransactionArgument<number | bigint>,
				isBid: RawTransactionArgument<boolean>,
				payWithDeep: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/**
 * Check if a market order can be placed based on balance manager balances. Returns
 * true if the balance manager has sufficient balance (accounting for fees) to
 * place the order, false otherwise. Does not account for discounted taker fees
 */
export function canPlaceMarketOrder(options: CanPlaceMarketOrderOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
		'u64',
		'bool',
		'bool',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager', 'quantity', 'isBid', 'payWithDeep'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'can_place_market_order',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CheckMarketOrderParamsArguments {
	self: RawTransactionArgument<string>;
	quantity: RawTransactionArgument<number | bigint>;
}
export interface CheckMarketOrderParamsOptions {
	package?: string;
	arguments:
		| CheckMarketOrderParamsArguments
		| [self: RawTransactionArgument<string>, quantity: RawTransactionArgument<number | bigint>];
	typeArguments: [string, string];
}
/**
 * Check if a market order can be placed based on pool book params. Returns true if
 * the order parameters are valid, false otherwise.
 */
export function checkMarketOrderParams(options: CheckMarketOrderParamsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
	] satisfies string[];
	const parameterNames = ['self', 'quantity'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'check_market_order_params',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface CheckLimitOrderParamsArguments {
	self: RawTransactionArgument<string>;
	price: RawTransactionArgument<number | bigint>;
	quantity: RawTransactionArgument<number | bigint>;
	expireTimestamp: RawTransactionArgument<number | bigint>;
}
export interface CheckLimitOrderParamsOptions {
	package?: string;
	arguments:
		| CheckLimitOrderParamsArguments
		| [
				self: RawTransactionArgument<string>,
				price: RawTransactionArgument<number | bigint>,
				quantity: RawTransactionArgument<number | bigint>,
				expireTimestamp: RawTransactionArgument<number | bigint>,
		  ];
	typeArguments: [string, string];
}
/**
 * Check if a limit order can be placed based on pool book params. Returns true if
 * the order parameters are valid, false otherwise.
 */
export function checkLimitOrderParams(options: CheckLimitOrderParamsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'u64',
		'u64',
		'u64',
		'0x0000000000000000000000000000000000000000000000000000000000000002::clock::Clock',
	] satisfies string[];
	const parameterNames = ['self', 'price', 'quantity', 'expireTimestamp'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'check_limit_order_params',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PoolTradeParamsArguments {
	self: RawTransactionArgument<string>;
}
export interface PoolTradeParamsOptions {
	package?: string;
	arguments: PoolTradeParamsArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/**
 * Returns the trade params for the pool. Returns (taker_fee, maker_fee,
 * stake_required)
 */
export function poolTradeParams(options: PoolTradeParamsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'pool_trade_params',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PoolTradeParamsNextArguments {
	self: RawTransactionArgument<string>;
}
export interface PoolTradeParamsNextOptions {
	package?: string;
	arguments: PoolTradeParamsNextArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Returns the currently leading trade params for the next epoch for the pool */
export function poolTradeParamsNext(options: PoolTradeParamsNextOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'pool_trade_params_next',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface PoolBookParamsArguments {
	self: RawTransactionArgument<string>;
}
export interface PoolBookParamsOptions {
	package?: string;
	arguments: PoolBookParamsArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Returns the tick size, lot size, and min size for the pool. */
export function poolBookParams(options: PoolBookParamsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'pool_book_params',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AccountExistsArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
}
export interface AccountExistsOptions {
	package?: string;
	arguments:
		| AccountExistsArguments
		| [self: RawTransactionArgument<string>, balanceManager: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function accountExists(options: AccountExistsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'account_exists',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface AccountArguments {
	self: RawTransactionArgument<string>;
	balanceManager: RawTransactionArgument<string>;
}
export interface AccountOptions {
	package?: string;
	arguments:
		| AccountArguments
		| [self: RawTransactionArgument<string>, balanceManager: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function account(options: AccountOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::BalanceManager`,
	] satisfies string[];
	const parameterNames = ['self', 'balanceManager'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'account',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface QuorumArguments {
	self: RawTransactionArgument<string>;
}
export interface QuorumOptions {
	package?: string;
	arguments: QuorumArguments | [self: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
/** Returns the quorum needed to pass proposal in the current epoch */
export function quorum(options: QuorumOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'quorum',
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
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
	] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface GetReferralBalancesArguments {
	self: RawTransactionArgument<string>;
	referral: RawTransactionArgument<string>;
}
export interface GetReferralBalancesOptions {
	package?: string;
	arguments:
		| GetReferralBalancesArguments
		| [self: RawTransactionArgument<string>, referral: RawTransactionArgument<string>];
	typeArguments: [string, string];
}
export function getReferralBalances(options: GetReferralBalancesOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		`${packageAddress}::balance_manager::DeepBookReferral`,
	] satisfies string[];
	const parameterNames = ['self', 'referral'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool',
			function: 'get_referral_balances',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
