/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface Ed25519VerifyArguments {
	signature: RawTransactionArgument<number[]>;
	publicKey: RawTransactionArgument<number[]>;
	msg: RawTransactionArgument<number[]>;
}
export interface Ed25519VerifyOptions {
	package: string;
	arguments:
		| Ed25519VerifyArguments
		| [
				signature: RawTransactionArgument<number[]>,
				publicKey: RawTransactionArgument<number[]>,
				msg: RawTransactionArgument<number[]>,
		  ];
}
/**
 * @param signature: 32-byte signature that is a point on the Ed25519 elliptic
 * curve. @param public_key: 32-byte signature that is a point on the Ed25519
 * elliptic curve. @param msg: The message that we test the signature against.
 *
 * If the signature is a valid Ed25519 signature of the message and public key,
 * return true. Otherwise, return false.
 */
export function ed25519Verify(options: Ed25519VerifyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['signature', 'publicKey', 'msg'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ed25519',
			function: 'ed25519_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
