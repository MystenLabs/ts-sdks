/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::bcs';
export const BCS = new MoveStruct({
	name: `${$moduleName}::BCS`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
	},
});
export interface ToBytesOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<T0>];
	typeArguments: [string];
}
export function toBytes<T0 extends BcsType<any>>(options: ToBytesOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${options.typeArguments[0]}`] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
export interface NewOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function _new(options: NewOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface IntoRemainderBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function intoRemainderBytes(options: IntoRemainderBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'into_remainder_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelAddressOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelAddress(options: PeelAddressOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelBoolOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelBool(options: PeelBoolOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_bool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelU8Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelU8(options: PeelU8Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelU16Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelU16(options: PeelU16Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelU32Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelU32(options: PeelU32Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelU64Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelU64(options: PeelU64Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelU128Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelU128(options: PeelU128Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelU256Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelU256(options: PeelU256Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecLengthOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecLength(options: PeelVecLengthOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecAddressOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecAddress(options: PeelVecAddressOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecBoolOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecBool(options: PeelVecBoolOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_bool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecU8Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecU8(options: PeelVecU8Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecVecU8Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecVecU8(options: PeelVecVecU8Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_vec_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecU16Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecU16(options: PeelVecU16Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecU32Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecU32(options: PeelVecU32Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecU64Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecU64(options: PeelVecU64Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecU128Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecU128(options: PeelVecU128Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelVecU256Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelVecU256(options: PeelVecU256Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_vec_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelEnumTagOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelEnumTag(options: PeelEnumTagOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_enum_tag',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelOptionAddressOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelOptionAddress(options: PeelOptionAddressOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelOptionBoolOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelOptionBool(options: PeelOptionBoolOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_bool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelOptionU8Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelOptionU8(options: PeelOptionU8Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelOptionU16Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelOptionU16(options: PeelOptionU16Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelOptionU32Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelOptionU32(options: PeelOptionU32Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelOptionU64Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelOptionU64(options: PeelOptionU64Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelOptionU128Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelOptionU128(options: PeelOptionU128Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PeelOptionU256Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function peelOptionU256(options: PeelOptionU256Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bcs',
			function: 'peel_option_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
