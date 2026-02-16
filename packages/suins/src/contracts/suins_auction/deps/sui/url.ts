/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** URL: standard Uniform Resource Locator string */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::url';
export const Url = new MoveStruct({
	name: `${$moduleName}::Url`,
	fields: {
		url: bcs.string(),
	},
});
export interface NewUnsafeArguments {
	url: RawTransactionArgument<string>;
}
export interface NewUnsafeOptions {
	package: string;
	arguments: NewUnsafeArguments | [url: RawTransactionArgument<string>];
}
/** Create a `Url`, with no validation */
export function newUnsafe(options: NewUnsafeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['url'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'url',
			function: 'new_unsafe',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface NewUnsafeFromBytesArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface NewUnsafeFromBytesOptions {
	package: string;
	arguments: NewUnsafeFromBytesArguments | [bytes: RawTransactionArgument<number[]>];
}
/**
 * Create a `Url` with no validation from bytes Note: this will abort if `bytes` is
 * not valid ASCII
 */
export function newUnsafeFromBytes(options: NewUnsafeFromBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'url',
			function: 'new_unsafe_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InnerUrlArguments {
	self: RawTransactionArgument<string>;
}
export interface InnerUrlOptions {
	package: string;
	arguments: InnerUrlArguments | [self: RawTransactionArgument<string>];
}
/** Get inner URL */
export function innerUrl(options: InnerUrlOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['self'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'url',
			function: 'inner_url',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UpdateArguments {
	self: RawTransactionArgument<string>;
	url: RawTransactionArgument<string>;
}
export interface UpdateOptions {
	package: string;
	arguments:
		| UpdateArguments
		| [self: RawTransactionArgument<string>, url: RawTransactionArgument<string>];
}
/** Update the inner URL */
export function update(options: UpdateOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['self', 'url'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'url',
			function: 'update',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
