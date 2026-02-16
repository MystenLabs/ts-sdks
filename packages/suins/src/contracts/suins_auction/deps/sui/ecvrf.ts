/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface EcvrfVerifyArguments {
	hash: RawTransactionArgument<number[]>;
	alphaString: RawTransactionArgument<number[]>;
	publicKey: RawTransactionArgument<number[]>;
	proof: RawTransactionArgument<number[]>;
}
export interface EcvrfVerifyOptions {
	package: string;
	arguments:
		| EcvrfVerifyArguments
		| [
				hash: RawTransactionArgument<number[]>,
				alphaString: RawTransactionArgument<number[]>,
				publicKey: RawTransactionArgument<number[]>,
				proof: RawTransactionArgument<number[]>,
		  ];
}
/**
 * @param hash: The hash/output from a ECVRF to be verified. @param alpha_string:
 * Input/seed to the ECVRF used to generate the output. @param public_key: The
 * public key corresponding to the private key used to generate the output. @param
 * proof: The proof of validity of the output. Verify a proof for a Ristretto
 * ECVRF. Returns true if the proof is valid and corresponds to the given output.
 * May abort with `EInvalidHashLength`, `EInvalidPublicKeyEncoding` or
 * `EInvalidProofEncoding`.
 */
export function ecvrfVerify(options: EcvrfVerifyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['hash', 'alphaString', 'publicKey', 'proof'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'ecvrf',
			function: 'ecvrf_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
