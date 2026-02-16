/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface ToU256Arguments {
	a: RawTransactionArgument<string>;
}
export interface ToU256Options {
	package: string;
	arguments: ToU256Arguments | [a: RawTransactionArgument<string>];
}
/**
 * Convert `a` into a u256 by interpreting `a` as the bytes of a big-endian integer
 * (e.g., `to_u256(0x1) == 1`)
 */
export function toU256(options: ToU256Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['address'] satisfies (string | null)[];
	const parameterNames = ['a'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'to_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FromU256Arguments {
	n: RawTransactionArgument<number | bigint>;
}
export interface FromU256Options {
	package: string;
	arguments: FromU256Arguments | [n: RawTransactionArgument<number | bigint>];
}
/**
 * Convert `n` into an address by encoding it as a big-endian integer (e.g.,
 * `from_u256(1) = @0x1`) Aborts if `n` > `MAX_ADDRESS`
 */
export function fromU256(options: FromU256Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['u256'] satisfies (string | null)[];
	const parameterNames = ['n'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'from_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FromBytesArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface FromBytesOptions {
	package: string;
	arguments: FromBytesArguments | [bytes: RawTransactionArgument<number[]>];
}
/**
 * Convert `bytes` into an address. Aborts with `EAddressParseError` if the length
 * of `bytes` is not 32
 */
export function fromBytes(options: FromBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToBytesArguments {
	a: RawTransactionArgument<string>;
}
export interface ToBytesOptions {
	package: string;
	arguments: ToBytesArguments | [a: RawTransactionArgument<string>];
}
/** Convert `a` into BCS-encoded bytes. */
export function toBytes(options: ToBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['address'] satisfies (string | null)[];
	const parameterNames = ['a'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToAsciiStringArguments {
	a: RawTransactionArgument<string>;
}
export interface ToAsciiStringOptions {
	package: string;
	arguments: ToAsciiStringArguments | [a: RawTransactionArgument<string>];
}
/** Convert `a` to a hex-encoded ASCII string */
export function toAsciiString(options: ToAsciiStringOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['address'] satisfies (string | null)[];
	const parameterNames = ['a'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'to_ascii_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ToStringArguments {
	a: RawTransactionArgument<string>;
}
export interface ToStringOptions {
	package: string;
	arguments: ToStringArguments | [a: RawTransactionArgument<string>];
}
/** Convert `a` to a hex-encoded string */
export function toString(options: ToStringOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['address'] satisfies (string | null)[];
	const parameterNames = ['a'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'to_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface FromAsciiBytesArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface FromAsciiBytesOptions {
	package: string;
	arguments: FromAsciiBytesArguments | [bytes: RawTransactionArgument<number[]>];
}
/**
 * Converts an ASCII string to an address, taking the numerical value for each
 * character. The string must be Base16 encoded, and thus exactly 64 characters
 * long. For example, the string
 * "00000000000000000000000000000000000000000000000000000000DEADB33F" will be
 * converted to the address @0xDEADB33F. Aborts with `EAddressParseError` if the
 * length of `s` is not 64, or if an invalid character is encountered.
 */
export function fromAsciiBytes(options: FromAsciiBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'from_ascii_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LengthOptions {
	package: string;
	arguments?: [];
}
/** Length of a Sui address in bytes */
export function length(options: LengthOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'length',
		});
}
export interface MaxOptions {
	package: string;
	arguments?: [];
}
/** Largest possible address */
export function max(options: MaxOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'max',
		});
}
