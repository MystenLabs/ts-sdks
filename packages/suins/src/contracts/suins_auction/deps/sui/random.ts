/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** This module provides functionality for generating secure randomness. */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs, type BcsType } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as versioned from './versioned.js';
const $moduleName = '0x2::random';
export const Random = new MoveStruct({
	name: `${$moduleName}::Random`,
	fields: {
		id: bcs.Address,
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
export interface NewGeneratorArguments {}
export interface NewGeneratorOptions {
	package: string;
	arguments?: NewGeneratorArguments | [];
}
/**
 * Create a generator. Can be used to derive up to MAX_U16 \* 32 random bytes.
 *
 * Using randomness can be error-prone if you don't observe the subtleties in its
 * correct use, for example, randomness dependent code might be exploitable to
 * attacks that carefully set the gas budget in a way that breaks security. For
 * more information, see:
 * https://docs.sui.io/guides/developer/advanced/randomness-onchain
 */
export function newGenerator(options: NewGeneratorOptions = {}) {
	const packageAddress = options.package;
	const argumentsTypes = ['0x2::random::Random'] satisfies (string | null)[];
	const parameterNames = [];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'new_generator',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes, parameterNames),
		});
}
export interface GenerateBytesArguments {
	g: RawTransactionArgument<string>;
	numOfBytes: RawTransactionArgument<number>;
}
export interface GenerateBytesOptions {
	package: string;
	arguments:
		| GenerateBytesArguments
		| [g: RawTransactionArgument<string>, numOfBytes: RawTransactionArgument<number>];
}
/** Generate n random bytes. */
export function generateBytes(options: GenerateBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u16'] satisfies (string | null)[];
	const parameterNames = ['g', 'numOfBytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU256Arguments {
	g: RawTransactionArgument<string>;
}
export interface GenerateU256Options {
	package: string;
	arguments: GenerateU256Arguments | [g: RawTransactionArgument<string>];
}
/** Generate a u256. */
export function generateU256(options: GenerateU256Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['g'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU128Arguments {
	g: RawTransactionArgument<string>;
}
export interface GenerateU128Options {
	package: string;
	arguments: GenerateU128Arguments | [g: RawTransactionArgument<string>];
}
/** Generate a u128. */
export function generateU128(options: GenerateU128Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['g'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u128',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU64Arguments {
	g: RawTransactionArgument<string>;
}
export interface GenerateU64Options {
	package: string;
	arguments: GenerateU64Arguments | [g: RawTransactionArgument<string>];
}
/** Generate a u64. */
export function generateU64(options: GenerateU64Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['g'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU32Arguments {
	g: RawTransactionArgument<string>;
}
export interface GenerateU32Options {
	package: string;
	arguments: GenerateU32Arguments | [g: RawTransactionArgument<string>];
}
/** Generate a u32. */
export function generateU32(options: GenerateU32Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['g'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u32',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU16Arguments {
	g: RawTransactionArgument<string>;
}
export interface GenerateU16Options {
	package: string;
	arguments: GenerateU16Arguments | [g: RawTransactionArgument<string>];
}
/** Generate a u16. */
export function generateU16(options: GenerateU16Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['g'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u16',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU8Arguments {
	g: RawTransactionArgument<string>;
}
export interface GenerateU8Options {
	package: string;
	arguments: GenerateU8Arguments | [g: RawTransactionArgument<string>];
}
/** Generate a u8. */
export function generateU8(options: GenerateU8Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['g'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u8',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateBoolArguments {
	g: RawTransactionArgument<string>;
}
export interface GenerateBoolOptions {
	package: string;
	arguments: GenerateBoolArguments | [g: RawTransactionArgument<string>];
}
/** Generate a boolean. */
export function generateBool(options: GenerateBoolOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['g'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_bool',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU128InRangeArguments {
	g: RawTransactionArgument<string>;
	min: RawTransactionArgument<number | bigint>;
	max: RawTransactionArgument<number | bigint>;
}
export interface GenerateU128InRangeOptions {
	package: string;
	arguments:
		| GenerateU128InRangeArguments
		| [
				g: RawTransactionArgument<string>,
				min: RawTransactionArgument<number | bigint>,
				max: RawTransactionArgument<number | bigint>,
		  ];
}
/** Generate a random u128 in [min, max] (with a bias of 2^{-64}). */
export function generateU128InRange(options: GenerateU128InRangeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u128', 'u128'] satisfies (string | null)[];
	const parameterNames = ['g', 'min', 'max'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u128_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU64InRangeArguments {
	g: RawTransactionArgument<string>;
	min: RawTransactionArgument<number | bigint>;
	max: RawTransactionArgument<number | bigint>;
}
export interface GenerateU64InRangeOptions {
	package: string;
	arguments:
		| GenerateU64InRangeArguments
		| [
				g: RawTransactionArgument<string>,
				min: RawTransactionArgument<number | bigint>,
				max: RawTransactionArgument<number | bigint>,
		  ];
}
export function generateU64InRange(options: GenerateU64InRangeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u64', 'u64'] satisfies (string | null)[];
	const parameterNames = ['g', 'min', 'max'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u64_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU32InRangeArguments {
	g: RawTransactionArgument<string>;
	min: RawTransactionArgument<number>;
	max: RawTransactionArgument<number>;
}
export interface GenerateU32InRangeOptions {
	package: string;
	arguments:
		| GenerateU32InRangeArguments
		| [
				g: RawTransactionArgument<string>,
				min: RawTransactionArgument<number>,
				max: RawTransactionArgument<number>,
		  ];
}
/** Generate a random u32 in [min, max] (with a bias of 2^{-64}). */
export function generateU32InRange(options: GenerateU32InRangeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u32', 'u32'] satisfies (string | null)[];
	const parameterNames = ['g', 'min', 'max'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u32_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU16InRangeArguments {
	g: RawTransactionArgument<string>;
	min: RawTransactionArgument<number>;
	max: RawTransactionArgument<number>;
}
export interface GenerateU16InRangeOptions {
	package: string;
	arguments:
		| GenerateU16InRangeArguments
		| [
				g: RawTransactionArgument<string>,
				min: RawTransactionArgument<number>,
				max: RawTransactionArgument<number>,
		  ];
}
/** Generate a random u16 in [min, max] (with a bias of 2^{-64}). */
export function generateU16InRange(options: GenerateU16InRangeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u16', 'u16'] satisfies (string | null)[];
	const parameterNames = ['g', 'min', 'max'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u16_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GenerateU8InRangeArguments {
	g: RawTransactionArgument<string>;
	min: RawTransactionArgument<number>;
	max: RawTransactionArgument<number>;
}
export interface GenerateU8InRangeOptions {
	package: string;
	arguments:
		| GenerateU8InRangeArguments
		| [
				g: RawTransactionArgument<string>,
				min: RawTransactionArgument<number>,
				max: RawTransactionArgument<number>,
		  ];
}
/** Generate a random u8 in [min, max] (with a bias of 2^{-64}). */
export function generateU8InRange(options: GenerateU8InRangeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'u8', 'u8'] satisfies (string | null)[];
	const parameterNames = ['g', 'min', 'max'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'generate_u8_in_range',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ShuffleArguments<T extends BcsType<any>> {
	g: RawTransactionArgument<string>;
	v: RawTransactionArgument<T[]>;
}
export interface ShuffleOptions<T extends BcsType<any>> {
	package: string;
	arguments:
		| ShuffleArguments<T>
		| [g: RawTransactionArgument<string>, v: RawTransactionArgument<T[]>];
	typeArguments: [string];
}
/** Shuffle a vector using the random generator (Fisher–Yates/Knuth shuffle). */
export function shuffle<T extends BcsType<any>>(options: ShuffleOptions<T>) {
	const packageAddress = options.package;
	const argumentsTypes = [null, `vector<${options.typeArguments[0]}>`] satisfies (string | null)[];
	const parameterNames = ['g', 'v'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'random',
			function: 'shuffle',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
			typeArguments: options.typeArguments,
		});
}
