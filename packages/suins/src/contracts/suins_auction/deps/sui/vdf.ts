/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface HashToInputArguments {
	message: RawTransactionArgument<number[]>;
}
export interface HashToInputOptions {
	package: string;
	arguments: HashToInputArguments | [message: RawTransactionArgument<number[]>];
}
/**
 * Hash an arbitrary binary `message` to a class group element to be used as input
 * for `vdf_verify`.
 *
 * This function is currently only enabled on Devnet.
 */
export function hashToInput(options: HashToInputOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['message'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vdf',
			function: 'hash_to_input',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VdfVerifyArguments {
	input: RawTransactionArgument<number[]>;
	output: RawTransactionArgument<number[]>;
	proof: RawTransactionArgument<number[]>;
	iterations: RawTransactionArgument<number | bigint>;
}
export interface VdfVerifyOptions {
	package: string;
	arguments:
		| VdfVerifyArguments
		| [
				input: RawTransactionArgument<number[]>,
				output: RawTransactionArgument<number[]>,
				proof: RawTransactionArgument<number[]>,
				iterations: RawTransactionArgument<number | bigint>,
		  ];
}
/**
 * Verify the output and proof of a VDF with the given number of iterations. The
 * `input`, `output` and `proof` are all class group elements represented by
 * triples `(a,b,c)` such that `b^2 - 4ac = discriminant`. The are expected to be
 * encoded as a BCS encoding of a triple of byte arrays, each being the big-endian
 * twos-complement encoding of a, b and c in that order.
 *
 * This uses Wesolowski's VDF construction over imaginary class groups as described
 * in Wesolowski (2020), 'Efficient Verifiable Delay Functions.', J. Cryptol. 33,
 * and is compatible with the VDF implementation in fastcrypto.
 *
 * The discriminant for the class group is pre-computed and fixed. See how this was
 * generated in the fastcrypto-vdf crate. The final selection of the discriminant
 * for Mainnet will be computed and announced under a nothing-up-my-sleeve process.
 *
 * This function is currently only enabled on Devnet.
 */
export function vdfVerify(options: VdfVerifyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>', 'u64'] satisfies (
		| string
		| null
	)[];
	const parameterNames = ['input', 'output', 'proof', 'iterations'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'vdf',
			function: 'vdf_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
