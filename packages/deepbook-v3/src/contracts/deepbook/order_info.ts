/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Order module defines the order struct and its methods. All order matching
 * happens in this module.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as deep_price from './deep_price.js';
import * as fill from './fill.js';
const $moduleName = '@deepbook/core::order_info';
export const OrderInfo = new MoveStruct({
	name: `${$moduleName}::OrderInfo`,
	fields: {
		pool_id: bcs.Address,
		order_id: bcs.u128(),
		balance_manager_id: bcs.Address,
		client_order_id: bcs.u64(),
		trader: bcs.Address,
		order_type: bcs.u8(),
		self_matching_option: bcs.u8(),
		price: bcs.u64(),
		is_bid: bcs.bool(),
		original_quantity: bcs.u64(),
		order_deep_price: deep_price.OrderDeepPrice,
		expire_timestamp: bcs.u64(),
		executed_quantity: bcs.u64(),
		cumulative_quote_quantity: bcs.u64(),
		fills: bcs.vector(fill.Fill),
		fee_is_deep: bcs.bool(),
		paid_fees: bcs.u64(),
		maker_fees: bcs.u64(),
		epoch: bcs.u64(),
		status: bcs.u8(),
		market_order: bcs.bool(),
		fill_limit_reached: bcs.bool(),
		order_inserted: bcs.bool(),
		timestamp: bcs.u64(),
	},
});
export const OrderFilled = new MoveStruct({
	name: `${$moduleName}::OrderFilled`,
	fields: {
		pool_id: bcs.Address,
		maker_order_id: bcs.u128(),
		taker_order_id: bcs.u128(),
		maker_client_order_id: bcs.u64(),
		taker_client_order_id: bcs.u64(),
		price: bcs.u64(),
		taker_is_bid: bcs.bool(),
		taker_fee: bcs.u64(),
		taker_fee_is_deep: bcs.bool(),
		maker_fee: bcs.u64(),
		maker_fee_is_deep: bcs.bool(),
		base_quantity: bcs.u64(),
		quote_quantity: bcs.u64(),
		maker_balance_manager_id: bcs.Address,
		taker_balance_manager_id: bcs.Address,
		timestamp: bcs.u64(),
	},
});
export const OrderPlaced = new MoveStruct({
	name: `${$moduleName}::OrderPlaced`,
	fields: {
		balance_manager_id: bcs.Address,
		pool_id: bcs.Address,
		order_id: bcs.u128(),
		client_order_id: bcs.u64(),
		trader: bcs.Address,
		price: bcs.u64(),
		is_bid: bcs.bool(),
		placed_quantity: bcs.u64(),
		expire_timestamp: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const OrderExpired = new MoveStruct({
	name: `${$moduleName}::OrderExpired`,
	fields: {
		balance_manager_id: bcs.Address,
		pool_id: bcs.Address,
		order_id: bcs.u128(),
		client_order_id: bcs.u64(),
		trader: bcs.Address,
		price: bcs.u64(),
		is_bid: bcs.bool(),
		original_quantity: bcs.u64(),
		base_asset_quantity_canceled: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export const OrderFullyFilled = new MoveStruct({
	name: `${$moduleName}::OrderFullyFilled`,
	fields: {
		pool_id: bcs.Address,
		order_id: bcs.u128(),
		client_order_id: bcs.u64(),
		balance_manager_id: bcs.Address,
		original_quantity: bcs.u64(),
		is_bid: bcs.bool(),
		timestamp: bcs.u64(),
	},
});
export interface PoolIdArguments {
	self: RawTransactionArgument<string>;
}
export interface PoolIdOptions {
	package?: string;
	arguments: PoolIdArguments | [self: RawTransactionArgument<string>];
}
export function poolId(options: PoolIdOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'pool_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderIdArguments {
	self: RawTransactionArgument<string>;
}
export interface OrderIdOptions {
	package?: string;
	arguments: OrderIdArguments | [self: RawTransactionArgument<string>];
}
export function orderId(options: OrderIdOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'order_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BalanceManagerIdArguments {
	self: RawTransactionArgument<string>;
}
export interface BalanceManagerIdOptions {
	package?: string;
	arguments: BalanceManagerIdArguments | [self: RawTransactionArgument<string>];
}
export function balanceManagerId(options: BalanceManagerIdOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'balance_manager_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ClientOrderIdArguments {
	self: RawTransactionArgument<string>;
}
export interface ClientOrderIdOptions {
	package?: string;
	arguments: ClientOrderIdArguments | [self: RawTransactionArgument<string>];
}
export function clientOrderId(options: ClientOrderIdOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'client_order_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TraderArguments {
	self: RawTransactionArgument<string>;
}
export interface TraderOptions {
	package?: string;
	arguments: TraderArguments | [self: RawTransactionArgument<string>];
}
export function trader(options: TraderOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'trader',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderTypeArguments {
	self: RawTransactionArgument<string>;
}
export interface OrderTypeOptions {
	package?: string;
	arguments: OrderTypeArguments | [self: RawTransactionArgument<string>];
}
export function orderType(options: OrderTypeOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'order_type',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SelfMatchingOptionArguments {
	self: RawTransactionArgument<string>;
}
export interface SelfMatchingOptionOptions {
	package?: string;
	arguments: SelfMatchingOptionArguments | [self: RawTransactionArgument<string>];
}
export function selfMatchingOption(options: SelfMatchingOptionOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'self_matching_option',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PriceArguments {
	self: RawTransactionArgument<string>;
}
export interface PriceOptions {
	package?: string;
	arguments: PriceArguments | [self: RawTransactionArgument<string>];
}
export function price(options: PriceOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsBidArguments {
	self: RawTransactionArgument<string>;
}
export interface IsBidOptions {
	package?: string;
	arguments: IsBidArguments | [self: RawTransactionArgument<string>];
}
export function isBid(options: IsBidOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'is_bid',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OriginalQuantityArguments {
	self: RawTransactionArgument<string>;
}
export interface OriginalQuantityOptions {
	package?: string;
	arguments: OriginalQuantityArguments | [self: RawTransactionArgument<string>];
}
export function originalQuantity(options: OriginalQuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'original_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderDeepPriceArguments {
	self: RawTransactionArgument<string>;
}
export interface OrderDeepPriceOptions {
	package?: string;
	arguments: OrderDeepPriceArguments | [self: RawTransactionArgument<string>];
}
export function orderDeepPrice(options: OrderDeepPriceOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'order_deep_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExpireTimestampArguments {
	self: RawTransactionArgument<string>;
}
export interface ExpireTimestampOptions {
	package?: string;
	arguments: ExpireTimestampArguments | [self: RawTransactionArgument<string>];
}
export function expireTimestamp(options: ExpireTimestampOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'expire_timestamp',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ExecutedQuantityArguments {
	self: RawTransactionArgument<string>;
}
export interface ExecutedQuantityOptions {
	package?: string;
	arguments: ExecutedQuantityArguments | [self: RawTransactionArgument<string>];
}
export function executedQuantity(options: ExecutedQuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'executed_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface CumulativeQuoteQuantityArguments {
	self: RawTransactionArgument<string>;
}
export interface CumulativeQuoteQuantityOptions {
	package?: string;
	arguments: CumulativeQuoteQuantityArguments | [self: RawTransactionArgument<string>];
}
export function cumulativeQuoteQuantity(options: CumulativeQuoteQuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'cumulative_quote_quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FillsArguments {
	self: RawTransactionArgument<string>;
}
export interface FillsOptions {
	package?: string;
	arguments: FillsArguments | [self: RawTransactionArgument<string>];
}
export function fills(options: FillsOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'fills',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FeeIsDeepArguments {
	self: RawTransactionArgument<string>;
}
export interface FeeIsDeepOptions {
	package?: string;
	arguments: FeeIsDeepArguments | [self: RawTransactionArgument<string>];
}
export function feeIsDeep(options: FeeIsDeepOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'fee_is_deep',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PaidFeesArguments {
	self: RawTransactionArgument<string>;
}
export interface PaidFeesOptions {
	package?: string;
	arguments: PaidFeesArguments | [self: RawTransactionArgument<string>];
}
export function paidFees(options: PaidFeesOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'paid_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface MakerFeesArguments {
	self: RawTransactionArgument<string>;
}
export interface MakerFeesOptions {
	package?: string;
	arguments: MakerFeesArguments | [self: RawTransactionArgument<string>];
}
export function makerFees(options: MakerFeesOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'maker_fees',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface EpochArguments {
	self: RawTransactionArgument<string>;
}
export interface EpochOptions {
	package?: string;
	arguments: EpochArguments | [self: RawTransactionArgument<string>];
}
export function epoch(options: EpochOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'epoch',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StatusArguments {
	self: RawTransactionArgument<string>;
}
export interface StatusOptions {
	package?: string;
	arguments: StatusArguments | [self: RawTransactionArgument<string>];
}
export function status(options: StatusOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'status',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FillLimitReachedArguments {
	self: RawTransactionArgument<string>;
}
export interface FillLimitReachedOptions {
	package?: string;
	arguments: FillLimitReachedArguments | [self: RawTransactionArgument<string>];
}
export function fillLimitReached(options: FillLimitReachedOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'fill_limit_reached',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface OrderInsertedArguments {
	self: RawTransactionArgument<string>;
}
export interface OrderInsertedOptions {
	package?: string;
	arguments: OrderInsertedArguments | [self: RawTransactionArgument<string>];
}
export function orderInserted(options: OrderInsertedOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_info',
			function: 'order_inserted',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
