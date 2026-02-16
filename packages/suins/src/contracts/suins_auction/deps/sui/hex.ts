/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** HEX (Base16) encoding utility. */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface EncodeArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface EncodeOptions {
	package: string;
	arguments: EncodeArguments | [bytes: RawTransactionArgument<number[]>];
}
/** Encode `bytes` in lowercase hex */
export function encode(options: EncodeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hex',
			function: 'encode',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DecodeArguments {
	hex: RawTransactionArgument<number[]>;
}
export interface DecodeOptions {
	package: string;
	arguments: DecodeArguments | [hex: RawTransactionArgument<number[]>];
}
/**
 * Decode hex into `bytes` Takes a hex string (no 0x prefix) (e.g. b"0f3a") Returns
 * vector of `bytes` that represents the hex string (e.g. x"0f3a") Hex string can
 * be case insensitive (e.g. b"0F3A" and b"0f3a" both return x"0f3a") Aborts if the
 * hex string does not have an even number of characters (as each hex character is
 * 2 characters long) Aborts if the hex string contains non-valid hex characters
 * (valid characters are 0 - 9, a - f, A - F)
 */
export function decode(options: DecodeOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['hex'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hex',
			function: 'decode',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
