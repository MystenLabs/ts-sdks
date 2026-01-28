/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as i64 from './i64.js';
const $moduleName = '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::price';
export const Price = new MoveStruct({
	name: `${$moduleName}::Price`,
	fields: {
		price: i64.I64,
		conf: bcs.u64(),
		expo: i64.I64,
		timestamp: bcs.u64(),
	},
});
export interface NewOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
	];
}
export function _new(options: NewOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, 'u64', null, 'u64'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getPrice(options: GetPriceOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price',
			function: 'get_price',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetConfOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getConf(options: GetConfOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price',
			function: 'get_conf',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetTimestampOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getTimestamp(options: GetTimestampOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price',
			function: 'get_timestamp',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetExpoOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getExpo(options: GetExpoOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price',
			function: 'get_expo',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
