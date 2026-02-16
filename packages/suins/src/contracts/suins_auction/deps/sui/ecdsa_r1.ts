/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface Secp256r1EcrecoverArguments {
	signature: RawTransactionArgument<number[]>;
	msg: RawTransactionArgument<number[]>;
	hash: RawTransactionArgument<number>;
}
export interface Secp256r1EcrecoverOptions {
	package: string;
	arguments:
		| Secp256r1EcrecoverArguments
		| [
				signature: RawTransactionArgument<number[]>,
				msg: RawTransactionArgument<number[]>,
				hash: RawTransactionArgument<number>,
		  ];
}
/**
 * @param signature: A 65-bytes signature in form (r, s, v) that is signed using
 * Secp256r1. Reference implementation on signature generation using RFC6979:
 * https://github.com/MystenLabs/fastcrypto/blob/74aec4886e62122a5b769464c2bea5f803cf8ecc/fastcrypto/src/secp256r1/mod.rs
 * The accepted v values are {0, 1, 2, 3}. @param msg: The message that the
 * signature is signed against, this is raw message without hashing. @param hash:
 * The u8 representing the name of hash function used to hash the message when
 * signing.
 *
 * If the signature is valid, return the corresponding recovered Secpk256r1 public
 * key, otherwise throw error. This is similar to ecrecover in Ethereum, can only
 * be applied to Secp256r1 signatures. May fail with `EFailToRecoverPubKey` or
 * `EInvalidSignature`.
 */
export function secp256r1Ecrecover(options: Secp256r1EcrecoverOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'u8'] satisfies (string | null)[];
	const parameterNames = ['signature', 'msg', 'hash'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_r1',
			function: 'secp256r1_ecrecover',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface Secp256r1VerifyArguments {
	signature: RawTransactionArgument<number[]>;
	publicKey: RawTransactionArgument<number[]>;
	msg: RawTransactionArgument<number[]>;
	hash: RawTransactionArgument<number>;
}
export interface Secp256r1VerifyOptions {
	package: string;
	arguments:
		| Secp256r1VerifyArguments
		| [
				signature: RawTransactionArgument<number[]>,
				publicKey: RawTransactionArgument<number[]>,
				msg: RawTransactionArgument<number[]>,
				hash: RawTransactionArgument<number>,
		  ];
}
/**
 * @param signature: A 64-bytes signature in form (r, s) that is signed using
 * Secp256r1. This is an non-recoverable signature without recovery id. Reference
 * implementation on signature generation using RFC6979:
 * https://github.com/MystenLabs/fastcrypto/blob/74aec4886e62122a5b769464c2bea5f803cf8ecc/fastcrypto/src/secp256r1/mod.rs
 * @param public_key: The public key to verify the signature against @param msg:
 * The message that the signature is signed against, this is raw message without
 * hashing. @param hash: The u8 representing the name of hash function used to hash
 * the message when signing.
 *
 * If the signature is valid to the pubkey and hashed message, return true. Else
 * false.
 */
export function secp256r1Verify(options: Secp256r1VerifyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>', 'u8'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['signature', 'publicKey', 'msg', 'hash'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_r1',
			function: 'secp256r1_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
