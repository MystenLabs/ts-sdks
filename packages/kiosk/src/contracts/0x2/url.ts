/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::url';
export const Url = new MoveStruct({
	name: `${$moduleName}::Url`,
	fields: {
		url: bcs.string(),
	},
});
export interface NewUnsafeOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function newUnsafe(options: NewUnsafeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'url',
			function: 'new_unsafe',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface NewUnsafeFromBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function newUnsafeFromBytes(options: NewUnsafeFromBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'url',
			function: 'new_unsafe_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface InnerUrlOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function innerUrl(options: InnerUrlOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'url',
			function: 'inner_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UpdateOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function update(options: UpdateOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'url',
			function: 'update',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
