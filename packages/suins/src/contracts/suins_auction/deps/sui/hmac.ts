/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface HmacSha3_256Arguments {
	key: RawTransactionArgument<number[]>;
	msg: RawTransactionArgument<number[]>;
}
export interface HmacSha3_256Options {
	package: string;
	arguments:
		| HmacSha3_256Arguments
		| [key: RawTransactionArgument<number[]>, msg: RawTransactionArgument<number[]>];
}
/**
 * @param key: HMAC key, arbitrary bytes. @param msg: message to sign, arbitrary
 * bytes. Returns the 32 bytes digest of HMAC-SHA3-256(key, msg).
 */
export function hmacSha3_256(options: HmacSha3_256Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['key', 'msg'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'hmac',
			function: 'hmac_sha3_256',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
