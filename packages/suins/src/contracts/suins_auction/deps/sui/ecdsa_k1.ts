/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface Secp256k1EcrecoverArguments {
	signature: RawTransactionArgument<number[]>;
	msg: RawTransactionArgument<number[]>;
	hash: RawTransactionArgument<number>;
}
export interface Secp256k1EcrecoverOptions {
	package: string;
	arguments:
		| Secp256k1EcrecoverArguments
		| [
				signature: RawTransactionArgument<number[]>,
				msg: RawTransactionArgument<number[]>,
				hash: RawTransactionArgument<number>,
		  ];
}
/**
 * @param signature: A 65-bytes signature in form (r, s, v) that is signed using
 * Secp256k1. Reference implementation on signature generation using RFC6979:
 * https://github.com/MystenLabs/narwhal/blob/5d6f6df8ccee94446ff88786c0dbbc98be7cfc09/crypto/src/secp256k1.rs
 * The accepted v values are {0, 1, 2, 3}. @param msg: The message that the
 * signature is signed against, this is raw message without hashing. @param hash:
 * The hash function used to hash the message when signing.
 *
 * If the signature is valid, return the corresponding recovered Secpk256k1 public
 * key, otherwise throw error. This is similar to ecrecover in Ethereum, can only
 * be applied to Secp256k1 signatures. May abort with `EFailToRecoverPubKey` or
 * `EInvalidSignature`.
 */
export function secp256k1Ecrecover(options: Secp256k1EcrecoverOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'u8'] satisfies (string | null)[];
	const parameterNames = ['signature', 'msg', 'hash'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_k1',
			function: 'secp256k1_ecrecover',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DecompressPubkeyArguments {
	pubkey: RawTransactionArgument<number[]>;
}
export interface DecompressPubkeyOptions {
	package: string;
	arguments: DecompressPubkeyArguments | [pubkey: RawTransactionArgument<number[]>];
}
/**
 * @param pubkey: A 33-bytes compressed public key, a prefix either 0x02 or 0x03
 * and a 256-bit integer.
 *
 * If the compressed public key is valid, return the 65-bytes uncompressed public
 * key, otherwise throw error. May abort with `EInvalidPubKey`.
 */
export function decompressPubkey(options: DecompressPubkeyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['pubkey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_k1',
			function: 'decompress_pubkey',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface Secp256k1VerifyArguments {
	signature: RawTransactionArgument<number[]>;
	publicKey: RawTransactionArgument<number[]>;
	msg: RawTransactionArgument<number[]>;
	hash: RawTransactionArgument<number>;
}
export interface Secp256k1VerifyOptions {
	package: string;
	arguments:
		| Secp256k1VerifyArguments
		| [
				signature: RawTransactionArgument<number[]>,
				publicKey: RawTransactionArgument<number[]>,
				msg: RawTransactionArgument<number[]>,
				hash: RawTransactionArgument<number>,
		  ];
}
/**
 * @param signature: A 64-bytes signature in form (r, s) that is signed using
 * Secp256k1. This is an non-recoverable signature without recovery id. Reference
 * implementation on signature generation using RFC6979:
 * https://github.com/MystenLabs/fastcrypto/blob/74aec4886e62122a5b769464c2bea5f803cf8ecc/fastcrypto/src/secp256k1/mod.rs#L193
 * @param public_key: The public key to verify the signature against @param msg:
 * The message that the signature is signed against, this is raw message without
 * hashing. @param hash: The hash function used to hash the message when signing.
 *
 * If the signature is valid to the pubkey and hashed message, return true. Else
 * false.
 */
export function secp256k1Verify(options: Secp256k1VerifyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>', 'u8'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['signature', 'publicKey', 'msg', 'hash'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecdsa_k1',
			function: 'secp256k1_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
