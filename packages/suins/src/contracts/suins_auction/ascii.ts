/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * The `ASCII` module defines basic string and char newtypes in Move that verify
 * that characters are valid ASCII, and that strings consist of only valid ASCII
 * characters.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/auction::ascii';
export const String = new MoveStruct({
	name: `${$moduleName}::String`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
	},
});
export const Char = new MoveStruct({
	name: `${$moduleName}::Char`,
	fields: {
		byte: bcs.u8(),
	},
});
export interface CharArguments {
	byte: RawTransactionArgument<number>;
}
export interface CharOptions {
	package?: string;
	arguments: CharArguments | [byte: RawTransactionArgument<number>];
}
/** Convert a `byte` into a `Char` that is checked to make sure it is valid ASCII. */
export function char(options: CharOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u8'] satisfies (string | null)[];
	const parameterNames = ['byte'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'char',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface StringArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface StringOptions {
	package?: string;
	arguments: StringArguments | [bytes: RawTransactionArgument<number[]>];
}
/**
 * Convert a vector of bytes `bytes` into an `String`. Aborts if `bytes` contains
 * non-ASCII characters.
 */
export function string(options: StringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface TryStringArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface TryStringOptions {
	package?: string;
	arguments: TryStringArguments | [bytes: RawTransactionArgument<number[]>];
}
/**
 * Convert a vector of bytes `bytes` into an `String`. Returns
 * `Some(<ascii_string>)` if the `bytes` contains all valid ASCII characters.
 * Otherwise returns `None`.
 */
export function tryString(options: TryStringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'try_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AllCharactersPrintableArguments {
	string: RawTransactionArgument<string>;
}
export interface AllCharactersPrintableOptions {
	package?: string;
	arguments: AllCharactersPrintableArguments | [string: RawTransactionArgument<string>];
}
/**
 * Returns `true` if all characters in `string` are printable characters Returns
 * `false` otherwise. Not all `String`s are printable strings.
 */
export function allCharactersPrintable(options: AllCharactersPrintableOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'all_characters_printable',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PushCharArguments {
	string: RawTransactionArgument<string>;
	char: RawTransactionArgument<string>;
}
export interface PushCharOptions {
	package?: string;
	arguments:
		| PushCharArguments
		| [string: RawTransactionArgument<string>, char: RawTransactionArgument<string>];
}
/** Push a `Char` to the end of the `string`. */
export function pushChar(options: PushCharOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String', null] satisfies (string | null)[];
	const parameterNames = ['string', 'char'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'push_char',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PopCharArguments {
	string: RawTransactionArgument<string>;
}
export interface PopCharOptions {
	package?: string;
	arguments: PopCharArguments | [string: RawTransactionArgument<string>];
}
/** Pop a `Char` from the end of the `string`. */
export function popChar(options: PopCharOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'pop_char',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LengthArguments {
	string: RawTransactionArgument<string>;
}
export interface LengthOptions {
	package?: string;
	arguments: LengthArguments | [string: RawTransactionArgument<string>];
}
/** Returns the length of the `string` in bytes. */
export function length(options: LengthOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AppendArguments {
	string: RawTransactionArgument<string>;
	other: RawTransactionArgument<string>;
}
export interface AppendOptions {
	package?: string;
	arguments:
		| AppendArguments
		| [string: RawTransactionArgument<string>, other: RawTransactionArgument<string>];
}
/** Append the `other` string to the end of `string`. */
export function append(options: AppendOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string', 'other'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'append',
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
/** Insert the `other` string at the `at` index of `string`. */
export function insert(options: InsertOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String', 'u64', '0x1::string::String'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['s', 'at', 'o'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'insert',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SubstringArguments {
	string: RawTransactionArgument<string>;
	i: RawTransactionArgument<number | bigint>;
	j: RawTransactionArgument<number | bigint>;
}
export interface SubstringOptions {
	package?: string;
	arguments:
		| SubstringArguments
		| [
				string: RawTransactionArgument<string>,
				i: RawTransactionArgument<number | bigint>,
				j: RawTransactionArgument<number | bigint>,
		  ];
}
/** Copy the slice of the `string` from `i` to `j` into a new `String`. */
export function substring(options: SubstringOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String', 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['string', 'i', 'j'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'substring',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AsBytesArguments {
	string: RawTransactionArgument<string>;
}
export interface AsBytesOptions {
	package?: string;
	arguments: AsBytesArguments | [string: RawTransactionArgument<string>];
}
/** Get the inner bytes of the `string` as a reference */
export function asBytes(options: AsBytesOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'as_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IntoBytesArguments {
	string: RawTransactionArgument<string>;
}
export interface IntoBytesOptions {
	package?: string;
	arguments: IntoBytesArguments | [string: RawTransactionArgument<string>];
}
/** Unpack the `string` to get its backing bytes */
export function intoBytes(options: IntoBytesOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'into_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ByteArguments {
	char: RawTransactionArgument<string>;
}
export interface ByteOptions {
	package?: string;
	arguments: ByteArguments | [char: RawTransactionArgument<string>];
}
/** Unpack the `char` into its underlying bytes. */
export function byte(options: ByteOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['char'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'byte',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsValidCharArguments {
	b: RawTransactionArgument<number>;
}
export interface IsValidCharOptions {
	package?: string;
	arguments: IsValidCharArguments | [b: RawTransactionArgument<number>];
}
/** Returns `true` if `b` is a valid ASCII character. Returns `false` otherwise. */
export function isValidChar(options: IsValidCharOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u8'] satisfies (string | null)[];
	const parameterNames = ['b'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'is_valid_char',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsPrintableCharArguments {
	byte: RawTransactionArgument<number>;
}
export interface IsPrintableCharOptions {
	package?: string;
	arguments: IsPrintableCharArguments | [byte: RawTransactionArgument<number>];
}
/**
 * Returns `true` if `byte` is a printable ASCII character. Returns `false`
 * otherwise.
 */
export function isPrintableChar(options: IsPrintableCharOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u8'] satisfies (string | null)[];
	const parameterNames = ['byte'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'is_printable_char',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsEmptyArguments {
	string: RawTransactionArgument<string>;
}
export interface IsEmptyOptions {
	package?: string;
	arguments: IsEmptyArguments | [string: RawTransactionArgument<string>];
}
/** Returns `true` if `string` is empty. */
export function isEmpty(options: IsEmptyOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'is_empty',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToUppercaseArguments {
	string: RawTransactionArgument<string>;
}
export interface ToUppercaseOptions {
	package?: string;
	arguments: ToUppercaseArguments | [string: RawTransactionArgument<string>];
}
/** Convert a `string` to its uppercase equivalent. */
export function toUppercase(options: ToUppercaseOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'to_uppercase',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToLowercaseArguments {
	string: RawTransactionArgument<string>;
}
export interface ToLowercaseOptions {
	package?: string;
	arguments: ToLowercaseArguments | [string: RawTransactionArgument<string>];
}
/** Convert a `string` to its lowercase equivalent. */
export function toLowercase(options: ToLowercaseOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'to_lowercase',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IndexOfArguments {
	string: RawTransactionArgument<string>;
	substr: RawTransactionArgument<string>;
}
export interface IndexOfOptions {
	package?: string;
	arguments:
		| IndexOfArguments
		| [string: RawTransactionArgument<string>, substr: RawTransactionArgument<string>];
}
/**
 * Computes the index of the first occurrence of the `substr` in the `string`.
 * Returns the length of the `string` if the `substr` is not found. Returns 0 if
 * the `substr` is empty.
 */
export function indexOf(options: IndexOfOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['0x1::string::String', '0x1::string::String'] satisfies (string | null)[];
	const parameterNames = ['string', 'substr'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ascii',
			function: 'index_of',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
