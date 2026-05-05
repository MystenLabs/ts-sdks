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
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::price_status';
export const PriceStatus: MoveStruct<{
	status: ReturnType<typeof bcs.u64>;
}> = new MoveStruct({
	name: `${$moduleName}::PriceStatus`,
	fields: {
		status: bcs.u64(),
	},
});
export interface FromU64Options {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>];
}
export function fromU64(options: FromU64Options): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = ['u64'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_status',
			function: 'from_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetStatusOptions {
	package?: string;
	arguments: [TransactionArgument];
}
export function getStatus(options: GetStatusOptions): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_status',
			function: 'get_status',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface NewUnknownOptions {
	package?: string;
	arguments?: [];
}
export function newUnknown(
	options: NewUnknownOptions = {},
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_status',
			function: 'new_unknown',
		});
}
export interface NewTradingOptions {
	package?: string;
	arguments?: [];
}
export function newTrading(
	options: NewTradingOptions = {},
): (tx: Transaction) => TransactionResult {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_status',
			function: 'new_trading',
		});
}
