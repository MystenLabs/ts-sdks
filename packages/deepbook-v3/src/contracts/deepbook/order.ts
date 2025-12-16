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
const $moduleName = '@deepbook/core::order';
export const Order = new MoveStruct({
	name: `${$moduleName}::Order`,
	fields: {
		balance_manager_id: bcs.Address,
		order_id: bcs.u128(),
		client_order_id: bcs.u64(),
		quantity: bcs.u64(),
		filled_quantity: bcs.u64(),
		fee_is_deep: bcs.bool(),
		order_deep_price: deep_price.OrderDeepPrice,
		epoch: bcs.u64(),
		status: bcs.u8(),
		expire_timestamp: bcs.u64(),
	},
});
export const OrderCanceled = new MoveStruct({
	name: `${$moduleName}::OrderCanceled`,
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
export const OrderModified = new MoveStruct({
	name: `${$moduleName}::OrderModified`,
	fields: {
		balance_manager_id: bcs.Address,
		pool_id: bcs.Address,
		order_id: bcs.u128(),
		client_order_id: bcs.u64(),
		trader: bcs.Address,
		price: bcs.u64(),
		is_bid: bcs.bool(),
		previous_quantity: bcs.u64(),
		filled_quantity: bcs.u64(),
		new_quantity: bcs.u64(),
		timestamp: bcs.u64(),
	},
});
export interface BalanceManagerIdArguments {
	self: RawTransactionArgument<string>;
}
export interface BalanceManagerIdOptions {
	package?: string;
	arguments: BalanceManagerIdArguments | [self: RawTransactionArgument<string>];
}
export function balanceManagerId(options: BalanceManagerIdOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'balance_manager_id',
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
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'order_id',
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
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'client_order_id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface QuantityArguments {
	self: RawTransactionArgument<string>;
}
export interface QuantityOptions {
	package?: string;
	arguments: QuantityArguments | [self: RawTransactionArgument<string>];
}
export function quantity(options: QuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'quantity',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FilledQuantityArguments {
	self: RawTransactionArgument<string>;
}
export interface FilledQuantityOptions {
	package?: string;
	arguments: FilledQuantityArguments | [self: RawTransactionArgument<string>];
}
export function filledQuantity(options: FilledQuantityOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'filled_quantity',
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
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'fee_is_deep',
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
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'order_deep_price',
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
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
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
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'status',
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
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'expire_timestamp',
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
	const argumentsTypes = [`${packageAddress}::order::Order`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order',
			function: 'price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
