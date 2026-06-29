/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@suins/auction::bit_vector';
export const BitVector = new MoveStruct({
	name: `${$moduleName}::BitVector`,
	fields: {
		length: bcs.u64(),
		bit_field: bcs.vector(bcs.bool()),
	},
});
export interface NewArguments {
	length: RawTransactionArgument<number | bigint>;
}
export interface NewOptions {
	package?: string;
	arguments: NewArguments | [length: RawTransactionArgument<number | bigint>];
}
export function _new(options: NewOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = ['u64'] satisfies (string | null)[];
	const parameterNames = ['length'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bit_vector',
			function: 'new',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface SetArguments {
	bitvector: RawTransactionArgument<string>;
	bitIndex: RawTransactionArgument<number | bigint>;
}
export interface SetOptions {
	package?: string;
	arguments:
		| SetArguments
		| [
				bitvector: RawTransactionArgument<string>,
				bitIndex: RawTransactionArgument<number | bigint>,
		  ];
}
/** Set the bit at `bit_index` in the `bitvector` regardless of its previous state. */
export function set(options: SetOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['bitvector', 'bitIndex'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bit_vector',
			function: 'set',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UnsetArguments {
	bitvector: RawTransactionArgument<string>;
	bitIndex: RawTransactionArgument<number | bigint>;
}
export interface UnsetOptions {
	package?: string;
	arguments:
		| UnsetArguments
		| [
				bitvector: RawTransactionArgument<string>,
				bitIndex: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Unset the bit at `bit_index` in the `bitvector` regardless of its previous
 * state.
 */
export function unset(options: UnsetOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['bitvector', 'bitIndex'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bit_vector',
			function: 'unset',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ShiftLeftArguments {
	bitvector: RawTransactionArgument<string>;
	amount: RawTransactionArgument<number | bigint>;
}
export interface ShiftLeftOptions {
	package?: string;
	arguments:
		| ShiftLeftArguments
		| [bitvector: RawTransactionArgument<string>, amount: RawTransactionArgument<number | bigint>];
}
/**
 * Shift the `bitvector` left by `amount`. If `amount` is greater than the
 * bitvector's length the bitvector will be zeroed out.
 */
export function shiftLeft(options: ShiftLeftOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['bitvector', 'amount'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bit_vector',
			function: 'shift_left',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface IsIndexSetArguments {
	bitvector: RawTransactionArgument<string>;
	bitIndex: RawTransactionArgument<number | bigint>;
}
export interface IsIndexSetOptions {
	package?: string;
	arguments:
		| IsIndexSetArguments
		| [
				bitvector: RawTransactionArgument<string>,
				bitIndex: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Return the value of the bit at `bit_index` in the `bitvector`. `true` represents
 * "1" and `false` represents a 0
 */
export function isIndexSet(options: IsIndexSetOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['bitvector', 'bitIndex'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bit_vector',
			function: 'is_index_set',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LengthArguments {
	bitvector: RawTransactionArgument<string>;
}
export interface LengthOptions {
	package?: string;
	arguments: LengthArguments | [bitvector: RawTransactionArgument<string>];
}
/** Return the length (number of usable bits) of this bitvector */
export function length(options: LengthOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['bitvector'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bit_vector',
			function: 'length',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface LongestSetSequenceStartingAtArguments {
	bitvector: RawTransactionArgument<string>;
	startIndex: RawTransactionArgument<number | bigint>;
}
export interface LongestSetSequenceStartingAtOptions {
	package?: string;
	arguments:
		| LongestSetSequenceStartingAtArguments
		| [
				bitvector: RawTransactionArgument<string>,
				startIndex: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Returns the length of the longest sequence of set bits starting at (and
 * including) `start_index` in the `bitvector`. If there is no such sequence, then
 * `0` is returned.
 */
export function longestSetSequenceStartingAt(options: LongestSetSequenceStartingAtOptions) {
	const packageAddress = options.package ?? '@suins/auction';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['bitvector', 'startIndex'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bit_vector',
			function: 'longest_set_sequence_starting_at',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
