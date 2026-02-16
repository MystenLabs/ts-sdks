/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * This module implements BCS (de)serialization in Move. Full specification can be
 * found here: https://github.com/diem/bcs
 *
 * Short summary (for Move-supported types):
 *
 * - address - sequence of X bytes
 * - bool - byte with 0 or 1
 * - u8 - a single u8 byte
 * - u16 / u32 / u64 / u128 / u256 - LE bytes
 * - vector - ULEB128 length + LEN elements
 * - option - first byte bool: None (0) or Some (1), then value
 *
 * Usage example:
 *
 * ```
 * /// This function reads u8 and u64 value from the input
 * /// and returns the rest of the bytes.
 * fun deserialize(bytes: vector<u8>): (u8, u64, vector<u8>) {
 *     use sui::bcs::{Self, BCS};
 *
 *     let prepared: BCS = bcs::new(bytes);
 *     let (u8_value, u64_value) = (
 *         prepared.peel_u8(),
 *         prepared.peel_u64()
 *     );
 *
 *     // unpack bcs struct
 *     let leftovers = prepared.into_remainder_bytes();
 *
 *     (u8_value, u64_value, leftovers)
 * }
 * ```
 */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::bcs';
export const BCS = new MoveStruct({
	name: `${$moduleName}::BCS`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
	},
});
export interface ToBytesArguments<T extends BcsType<any>> {
	value: RawTransactionArgument<T>;
}
export interface ToBytesOptions<T extends BcsType<any>> {
	package: string;
	arguments: ToBytesArguments<T> | [value: RawTransactionArgument<T>];
	typeArguments: [string];
}
/** Get BCS serialized bytes for any value. Re-exports stdlib `bcs::to_bytes`. */
export function toBytes<T extends BcsType<any>>(options: ToBytesOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	const parameterNames = ['value'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
export interface NewArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface NewOptions {
	package: string;
	arguments: NewArguments | [bytes: RawTransactionArgument<number[]>];
}
/**
 * Creates a new instance of BCS wrapper that holds inversed bytes for better
 * performance.
 */
export function _new(options: NewOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IntoRemainderBytesArguments {
	bcs: RawTransactionArgument<string>;
}
export interface IntoRemainderBytesOptions {
	package: string;
	arguments: IntoRemainderBytesArguments | [bcs: RawTransactionArgument<string>];
}
/**
 * Unpack the `BCS` struct returning the leftover bytes. Useful for passing the
 * data further after partial deserialization.
 */
export function intoRemainderBytes(options: IntoRemainderBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'into_remainder_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelAddressArguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelAddressOptions {
	package: string;
	arguments: PeelAddressArguments | [bcs: RawTransactionArgument<string>];
}
/** Read address from the bcs-serialized bytes. */
export function peelAddress(options: PeelAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelBoolArguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelBoolOptions {
	package: string;
	arguments: PeelBoolArguments | [bcs: RawTransactionArgument<string>];
}
/** Read a `bool` value from bcs-serialized bytes. */
export function peelBool(options: PeelBoolOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_bool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelU8Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelU8Options {
	package: string;
	arguments: PeelU8Arguments | [bcs: RawTransactionArgument<string>];
}
/** Read `u8` value from bcs-serialized bytes. */
export function peelU8(options: PeelU8Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelU16Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelU16Options {
	package: string;
	arguments: PeelU16Arguments | [bcs: RawTransactionArgument<string>];
}
/** Read `u16` value from bcs-serialized bytes. */
export function peelU16(options: PeelU16Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelU32Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelU32Options {
	package: string;
	arguments: PeelU32Arguments | [bcs: RawTransactionArgument<string>];
}
/** Read `u32` value from bcs-serialized bytes. */
export function peelU32(options: PeelU32Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelU64Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelU64Options {
	package: string;
	arguments: PeelU64Arguments | [bcs: RawTransactionArgument<string>];
}
/** Read `u64` value from bcs-serialized bytes. */
export function peelU64(options: PeelU64Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelU128Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelU128Options {
	package: string;
	arguments: PeelU128Arguments | [bcs: RawTransactionArgument<string>];
}
/** Read `u128` value from bcs-serialized bytes. */
export function peelU128(options: PeelU128Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelU256Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelU256Options {
	package: string;
	arguments: PeelU256Arguments | [bcs: RawTransactionArgument<string>];
}
/** Read `u256` value from bcs-serialized bytes. */
export function peelU256(options: PeelU256Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecLengthArguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecLengthOptions {
	package: string;
	arguments: PeelVecLengthArguments | [bcs: RawTransactionArgument<string>];
}
/**
 * Read ULEB bytes expecting a vector length. Result should then be used to perform
 * `peel_*` operation LEN times.
 *
 * In BCS `vector` length is implemented with ULEB128; See more here:
 * https://en.wikipedia.org/wiki/LEB128
 */
export function peelVecLength(options: PeelVecLengthOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecAddressArguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecAddressOptions {
	package: string;
	arguments: PeelVecAddressArguments | [bcs: RawTransactionArgument<string>];
}
/** Peel a vector of `address` from serialized bytes. */
export function peelVecAddress(options: PeelVecAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecBoolArguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecBoolOptions {
	package: string;
	arguments: PeelVecBoolArguments | [bcs: RawTransactionArgument<string>];
}
/** Peel a vector of `address` from serialized bytes. */
export function peelVecBool(options: PeelVecBoolOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_bool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecU8Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecU8Options {
	package: string;
	arguments: PeelVecU8Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel a vector of `u8` (eg string) from serialized bytes. */
export function peelVecU8(options: PeelVecU8Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecVecU8Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecVecU8Options {
	package: string;
	arguments: PeelVecVecU8Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel a `vector<vector<u8>>` (eg vec of string) from serialized bytes. */
export function peelVecVecU8(options: PeelVecVecU8Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_vec_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecU16Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecU16Options {
	package: string;
	arguments: PeelVecU16Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel a vector of `u16` from serialized bytes. */
export function peelVecU16(options: PeelVecU16Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecU32Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecU32Options {
	package: string;
	arguments: PeelVecU32Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel a vector of `u32` from serialized bytes. */
export function peelVecU32(options: PeelVecU32Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecU64Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecU64Options {
	package: string;
	arguments: PeelVecU64Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel a vector of `u64` from serialized bytes. */
export function peelVecU64(options: PeelVecU64Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecU128Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecU128Options {
	package: string;
	arguments: PeelVecU128Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel a vector of `u128` from serialized bytes. */
export function peelVecU128(options: PeelVecU128Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelVecU256Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelVecU256Options {
	package: string;
	arguments: PeelVecU256Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel a vector of `u256` from serialized bytes. */
export function peelVecU256(options: PeelVecU256Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelEnumTagArguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelEnumTagOptions {
	package: string;
	arguments: PeelEnumTagArguments | [bcs: RawTransactionArgument<string>];
}
/**
 * Peel enum from serialized bytes, where `$f` takes a `tag` value and returns the
 * corresponding enum variant. Move enums are limited to 127 variants, however the
 * tag can be any `u32` value.
 *
 * Example:
 *
 * ```rust
 * let my_enum = match (bcs.peel_enum_tag()) {
 *    0 => Enum::Empty,
 *    1 => Enum::U8(bcs.peel_u8()),
 *    2 => Enum::U16(bcs.peel_u16()),
 *    3 => Enum::Struct { a: bcs.peel_address(), b: bcs.peel_u8() },
 *    _ => abort,
 * };
 * ```
 */
export function peelEnumTag(options: PeelEnumTagOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_enum_tag',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelOptionAddressArguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelOptionAddressOptions {
	package: string;
	arguments: PeelOptionAddressArguments | [bcs: RawTransactionArgument<string>];
}
/** Peel `Option<address>` from serialized bytes. */
export function peelOptionAddress(options: PeelOptionAddressOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelOptionBoolArguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelOptionBoolOptions {
	package: string;
	arguments: PeelOptionBoolArguments | [bcs: RawTransactionArgument<string>];
}
/** Peel `Option<bool>` from serialized bytes. */
export function peelOptionBool(options: PeelOptionBoolOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_bool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelOptionU8Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelOptionU8Options {
	package: string;
	arguments: PeelOptionU8Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel `Option<u8>` from serialized bytes. */
export function peelOptionU8(options: PeelOptionU8Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelOptionU16Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelOptionU16Options {
	package: string;
	arguments: PeelOptionU16Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel `Option<u16>` from serialized bytes. */
export function peelOptionU16(options: PeelOptionU16Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelOptionU32Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelOptionU32Options {
	package: string;
	arguments: PeelOptionU32Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel `Option<u32>` from serialized bytes. */
export function peelOptionU32(options: PeelOptionU32Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelOptionU64Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelOptionU64Options {
	package: string;
	arguments: PeelOptionU64Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel `Option<u64>` from serialized bytes. */
export function peelOptionU64(options: PeelOptionU64Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelOptionU128Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelOptionU128Options {
	package: string;
	arguments: PeelOptionU128Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel `Option<u128>` from serialized bytes. */
export function peelOptionU128(options: PeelOptionU128Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PeelOptionU256Arguments {
	bcs: RawTransactionArgument<string>;
}
export interface PeelOptionU256Options {
	package: string;
	arguments: PeelOptionU256Arguments | [bcs: RawTransactionArgument<string>];
}
/** Peel `Option<u256>` from serialized bytes. */
export function peelOptionU256(options: PeelOptionU256Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bcs'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
