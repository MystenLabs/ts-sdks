/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import {
	type Transaction,
	type TransactionResult,
	type TransactionArgument,
} from '@mysten/sui/transactions';
import * as price_identifier from './price_identifier.js';
import * as price from './price.js';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::price_feed';
export const PriceFeed: MoveStruct<{
	price_identifier: typeof price_identifier.PriceIdentifier;
	price: typeof price.Price;
	ema_price: typeof price.Price;
}> = new MoveStruct({
	name: `${$moduleName}::PriceFeed`,
	fields: {
		price_identifier: price_identifier.PriceIdentifier,
		price: price.Price,
		ema_price: price.Price,
	},
});
export interface NewOptions {
	package?: string;
	arguments: [TransactionArgument, TransactionArgument, TransactionArgument];
}
export function _new(options: NewOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_feed',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface FromOptions {
	package?: string;
	arguments: [TransactionArgument];
}
export function _from(options: FromOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_feed',
			function: 'from',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceIdentifierOptions {
	package?: string;
	arguments: [TransactionArgument];
}
export function getPriceIdentifier(
	options: GetPriceIdentifierOptions,
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_feed',
			function: 'get_price_identifier',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceOptions {
	package?: string;
	arguments: [TransactionArgument];
}
export function getPrice(options: GetPriceOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_feed',
			function: 'get_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetEmaPriceOptions {
	package?: string;
	arguments: [TransactionArgument];
}
export function getEmaPrice(options: GetEmaPriceOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_feed',
			function: 'get_ema_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
