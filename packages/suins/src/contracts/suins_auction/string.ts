/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The `string` module defines the `String` type which represents UTF8 encoded
 * strings.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/auction::string';
export const String = new MoveStruct({
	name: `${$moduleName}::String`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
	},
});
export interface Utf8Arguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface Utf8Options {
	package?: string;
	arguments: Utf8Arguments | [bytes: RawTransactionArgument<number[]>];
}
/**
 * Creates a new string from a sequence of bytes. Aborts if the bytes do not
 * represent valid utf8.
 */
export function utf8(options: Utf8Options) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'utf8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FromAsciiArguments {
	s: RawTransactionArgument<string>;
}
export interface FromAsciiOptions {
	package?: string;
	arguments: FromAsciiArguments | [s: RawTransactionArgument<string>];
}
/** Convert an ASCII string to a UTF8 string */
export function fromAscii(options: FromAsciiOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'from_ascii',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToAsciiArguments {
	s: RawTransactionArgument<string>;
}
export interface ToAsciiOptions {
	package?: string;
	arguments: ToAsciiArguments | [s: RawTransactionArgument<string>];
}
/** Convert an UTF8 string to an ASCII string. Aborts if `s` is not valid ASCII */
export function toAscii(options: ToAsciiOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'to_ascii',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TryUtf8Arguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface TryUtf8Options {
	package?: string;
	arguments: TryUtf8Arguments | [bytes: RawTransactionArgument<number[]>];
}
/** Tries to create a new string from a sequence of bytes. */
export function tryUtf8(options: TryUtf8Options) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'try_utf8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AsBytesArguments {
	s: RawTransactionArgument<string>;
}
export interface AsBytesOptions {
	package?: string;
	arguments: AsBytesArguments | [s: RawTransactionArgument<string>];
}
/** Returns a reference to the underlying byte vector. */
export function asBytes(options: AsBytesOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'as_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IntoBytesArguments {
	s: RawTransactionArgument<string>;
}
export interface IntoBytesOptions {
	package?: string;
	arguments: IntoBytesArguments | [s: RawTransactionArgument<string>];
}
/** Unpack the `string` to get its underlying bytes. */
export function intoBytes(options: IntoBytesOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'into_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsEmptyArguments {
	s: RawTransactionArgument<string>;
}
export interface IsEmptyOptions {
	package?: string;
	arguments: IsEmptyArguments | [s: RawTransactionArgument<string>];
}
/** Checks whether this string is empty. */
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LengthArguments {
	s: RawTransactionArgument<string>;
}
export interface LengthOptions {
	package?: string;
	arguments: LengthArguments | [s: RawTransactionArgument<string>];
}
/** Returns the length of this string, in bytes. */
export function length(options: LengthOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AppendArguments {
	s: RawTransactionArgument<string>;
	r: RawTransactionArgument<string>;
}
export interface AppendOptions {
	package?: string;
	arguments:
		| AppendArguments
		| [s: RawTransactionArgument<string>, r: RawTransactionArgument<string>];
}
/** Appends a string. */
export function append(options: AppendOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['s', 'r'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'append',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AppendUtf8Arguments {
	s: RawTransactionArgument<string>;
	bytes: RawTransactionArgument<number[]>;
}
export interface AppendUtf8Options {
	package?: string;
	arguments:
		| AppendUtf8Arguments
		| [s: RawTransactionArgument<string>, bytes: RawTransactionArgument<number[]>];
}
/** Appends bytes which must be in valid utf8 format. */
export function appendUtf8(options: AppendUtf8Options) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['s', 'bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'append_utf8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface InsertArguments {
	s: RawTransactionArgument<string>;
	at: RawTransactionArgument<number | bigint>;
	o: RawTransactionArgument<string>;
}
export interface InsertOptions {
	package?: string;
	arguments:
		| InsertArguments
		| [
				s: RawTransactionArgument<string>,
				at: RawTransactionArgument<number | bigint>,
				o: RawTransactionArgument<string>,
		  ];
}
/**
 * Insert the other string at the byte index in given string. The index must be at
 * a valid utf8 char boundary.
 */
export function insert(options: InsertOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, 'u64', null] satisfies (string | null)[];
	const parameterNames = ['s', 'at', 'o'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'insert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SubstringArguments {
	s: RawTransactionArgument<string>;
	i: RawTransactionArgument<number | bigint>;
	j: RawTransactionArgument<number | bigint>;
}
export interface SubstringOptions {
	package?: string;
	arguments:
		| SubstringArguments
		| [
				s: RawTransactionArgument<string>,
				i: RawTransactionArgument<number | bigint>,
				j: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Returns a sub-string using the given byte indices, where `i` is the first byte
 * position and `j` is the start of the first byte not included (or the length of
 * the string). The indices must be at valid utf8 char boundaries, guaranteeing
 * that the result is valid utf8.
 */
export function substring(options: SubstringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['s', 'i', 'j'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'substring',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IndexOfArguments {
	s: RawTransactionArgument<string>;
	r: RawTransactionArgument<string>;
}
export interface IndexOfOptions {
	package?: string;
	arguments:
		| IndexOfArguments
		| [s: RawTransactionArgument<string>, r: RawTransactionArgument<string>];
}
/**
 * Computes the index of the first occurrence of a string. Returns `s.length()` if
 * no occurrence found.
 */
export function indexOf(options: IndexOfOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['s', 'r'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'index_of',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface BytesArguments {
	s: RawTransactionArgument<string>;
}
export interface BytesOptions {
	package?: string;
	arguments: BytesArguments | [s: RawTransactionArgument<string>];
}
export function bytes(options: BytesOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['s'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SubStringArguments {
	s: RawTransactionArgument<string>;
	i: RawTransactionArgument<number | bigint>;
	j: RawTransactionArgument<number | bigint>;
}
export interface SubStringOptions {
	package?: string;
	arguments:
		| SubStringArguments
		| [
				s: RawTransactionArgument<string>,
				i: RawTransactionArgument<number | bigint>,
				j: RawTransactionArgument<number | bigint>,
		  ];
}
export function subString(options: SubStringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['s', 'i', 'j'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'string',
			function: 'sub_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
