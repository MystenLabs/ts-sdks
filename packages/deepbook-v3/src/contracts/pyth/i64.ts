/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::i64';
export const I64 = new MoveStruct({
	name: `${$moduleName}::I64`,
	fields: {
		negative: bcs.bool(),
		magnitude: bcs.u64(),
	},
});
export interface NewOptions {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>, RawTransactionArgument<boolean>];
}
export function _new(options: NewOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = ['u64', 'bool'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'i64',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetIsNegativeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getIsNegative(options: GetIsNegativeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::i64::I64`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'i64',
			function: 'get_is_negative',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetMagnitudeIfPositiveOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getMagnitudeIfPositive(options: GetMagnitudeIfPositiveOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::i64::I64`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'i64',
			function: 'get_magnitude_if_positive',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetMagnitudeIfNegativeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getMagnitudeIfNegative(options: GetMagnitudeIfNegativeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::i64::I64`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'i64',
			function: 'get_magnitude_if_negative',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface FromU64Options {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>];
}
export function fromU64(options: FromU64Options) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = ['u64'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'i64',
			function: 'from_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
