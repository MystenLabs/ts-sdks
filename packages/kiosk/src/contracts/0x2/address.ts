/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
export interface ToU256Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function toU256(options: ToU256Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'to_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface FromU256Options {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>];
}
export function fromU256(options: FromU256Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u256'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'from_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface FromBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function fromBytes(options: FromBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ToBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function toBytes(options: ToBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ToAsciiStringOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function toAsciiString(options: ToAsciiStringOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'to_ascii_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ToStringOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function toString(options: ToStringOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['address'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'to_string',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface FromAsciiBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function fromAsciiBytes(options: FromAsciiBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'from_ascii_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface LengthOptions {
	package?: string;
	arguments?: [];
}
export function length(options: LengthOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'length',
		});
}
export interface MaxOptions {
	package?: string;
	arguments?: [];
}
export function max(options: MaxOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'address',
			function: 'max',
		});
}
