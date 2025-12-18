/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './object.js';
import * as versioned from './versioned.js';
const $moduleName = '0x2::random';
export const Random = new MoveStruct({
	name: `${$moduleName}::Random`,
	fields: {
		id: object.UID,
		inner: versioned.Versioned,
	},
});
export const RandomInner = new MoveStruct({
	name: `${$moduleName}::RandomInner`,
	fields: {
		version: bcs.u64(),
		epoch: bcs.u64(),
		randomness_round: bcs.u64(),
		random_bytes: bcs.vector(bcs.u8()),
	},
});
export const RandomGenerator = new MoveStruct({
	name: `${$moduleName}::RandomGenerator`,
	fields: {
		seed: bcs.vector(bcs.u8()),
		counter: bcs.u16(),
		buffer: bcs.vector(bcs.u8()),
	},
});
export interface NewGeneratorOptions {
	package?: string;
	arguments?: [];
}
export function newGenerator(options: NewGeneratorOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::random::Random`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'new_generator',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes),
		});
}
export interface GenerateBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number>];
}
export function generateBytes(options: GenerateBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::random::RandomGenerator`, 'u16'] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU256Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function generateU256(options: GenerateU256Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::random::RandomGenerator`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU128Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function generateU128(options: GenerateU128Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::random::RandomGenerator`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU64Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function generateU64(options: GenerateU64Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::random::RandomGenerator`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU32Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function generateU32(options: GenerateU32Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::random::RandomGenerator`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU16Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function generateU16(options: GenerateU16Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::random::RandomGenerator`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU8Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function generateU8(options: GenerateU8Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::random::RandomGenerator`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateBoolOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function generateBool(options: GenerateBoolOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::random::RandomGenerator`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_bool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU128InRangeOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<number | bigint>,
	];
}
export function generateU128InRange(options: GenerateU128InRangeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::random::RandomGenerator`,
		'u128',
		'u128',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u128_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU64InRangeOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number | bigint>,
		RawTransactionArgument<number | bigint>,
	];
}
export function generateU64InRange(options: GenerateU64InRangeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::random::RandomGenerator`,
		'u64',
		'u64',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u64_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU32InRangeOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number>,
		RawTransactionArgument<number>,
	];
}
export function generateU32InRange(options: GenerateU32InRangeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::random::RandomGenerator`,
		'u32',
		'u32',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u32_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU16InRangeOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number>,
		RawTransactionArgument<number>,
	];
}
export function generateU16InRange(options: GenerateU16InRangeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::random::RandomGenerator`,
		'u16',
		'u16',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u16_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GenerateU8InRangeOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<number>,
		RawTransactionArgument<number>,
	];
}
export function generateU8InRange(options: GenerateU8InRangeOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::random::RandomGenerator`,
		'u8',
		'u8',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u8_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ShuffleOptions<T0 extends BcsType<any>> {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<T0[]>];
	typeArguments: [string];
}
export function shuffle<T0 extends BcsType<any>>(options: ShuffleOptions<T0>) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [
		`${packageAddress}::random::RandomGenerator`,
		`vector<${options.typeArguments[0]}>`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'shuffle',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
			typeArguments: options.typeArguments,
		});
}
