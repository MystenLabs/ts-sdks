/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import {
	type Transaction,
	type TransactionResult,
	type TransactionArgument,
} from '@mysten/sui/transactions';
import * as i64 from './i64.js';
const $moduleName = '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::price';
export const Price: MoveStruct<{
	price: typeof i64.I64;
	conf: ReturnType<typeof bcs.u64>;
	expo: typeof i64.I64;
	timestamp: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
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
		TransactionArgument,
		RawTransactionArgument<number | bigint>,
		TransactionArgument,
		RawTransactionArgument<number | bigint>,
	];
}
export function _new(options: NewOptions): (tx: Transaction) => TransactionResult {
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
	arguments: [TransactionArgument];
}
export function getPrice(options: GetPriceOptions): (tx: Transaction) => TransactionResult {
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
	arguments: [TransactionArgument];
}
export function getConf(options: GetConfOptions): (tx: Transaction) => TransactionResult {
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
	arguments: [TransactionArgument];
}
export function getTimestamp(options: GetTimestampOptions): (tx: Transaction) => TransactionResult {
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
	arguments: [TransactionArgument];
}
export function getExpo(options: GetExpoOptions): (tx: Transaction) => TransactionResult {
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
