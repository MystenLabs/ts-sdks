/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * This module defines the OrderPage struct and its methods to iterate over orders
 * in a pool.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as order from './order.js';
const $moduleName = '@deepbook/core::order_query';
export const OrderPage = new MoveStruct({
	name: `${$moduleName}::OrderPage`,
	fields: {
		orders: bcs.vector(order.Order),
		has_next_page: bcs.bool(),
	},
});
export interface IterOrdersArguments {
	self: RawTransactionArgument<string>;
	startOrderId: RawTransactionArgument<number | bigint | null>;
	endOrderId: RawTransactionArgument<number | bigint | null>;
	minExpireTimestamp: RawTransactionArgument<number | bigint | null>;
	limit: RawTransactionArgument<number | bigint>;
	bids: RawTransactionArgument<boolean>;
}
export interface IterOrdersOptions {
	package?: string;
	arguments:
		| IterOrdersArguments
		| [
				self: RawTransactionArgument<string>,
				startOrderId: RawTransactionArgument<number | bigint | null>,
				endOrderId: RawTransactionArgument<number | bigint | null>,
				minExpireTimestamp: RawTransactionArgument<number | bigint | null>,
				limit: RawTransactionArgument<number | bigint>,
				bids: RawTransactionArgument<boolean>,
		  ];
	typeArguments: [string, string];
}
/**
 * Bid minimum order id has 0 for its first bit, 0 for next 63 bits for price, and
 * 1 for next 64 bits for order id. Ask minimum order id has 1 for its first bit, 0
 * for next 63 bits for price, and 0 for next 64 bits for order id. Bids are
 * iterated from high to low order id, and asks are iterated from low to high order
 * id.
 */
export function iterOrders(options: IterOrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [
		`${packageAddress}::pool::Pool<${options.typeArguments[0]}, ${options.typeArguments[1]}>`,
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<u128>',
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<u128>',
		'0x0000000000000000000000000000000000000000000000000000000000000001::option::Option<u64>',
		'u64',
		'bool',
	] satisfies string[];
	const parameterNames = [
		'self',
		'startOrderId',
		'endOrderId',
		'minExpireTimestamp',
		'limit',
		'bids',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_query',
			function: 'iter_orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface OrdersArguments {
	self: RawTransactionArgument<string>;
}
export interface OrdersOptions {
	package?: string;
	arguments: OrdersArguments | [self: RawTransactionArgument<string>];
}
export function orders(options: OrdersOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::order_query::OrderPage`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_query',
			function: 'orders',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HasNextPageArguments {
	self: RawTransactionArgument<string>;
}
export interface HasNextPageOptions {
	package?: string;
	arguments: HasNextPageArguments | [self: RawTransactionArgument<string>];
}
export function hasNextPage(options: HasNextPageOptions) {
	const packageAddress = options.package ?? '@deepbook/core';
	const argumentsTypes = [`${packageAddress}::order_query::OrderPage`] satisfies string[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'order_query',
			function: 'has_next_page',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
