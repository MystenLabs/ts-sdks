/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Module which defines instances of the poseidon hash functions. Available in
 * Devnet and Testnet.
 */

import { type Transaction } from '@mysten/sui/transactions';
import { normalizeMoveArguments, type RawTransactionArgument } from '../../../utils/index.js';
export interface PoseidonBn254Arguments {
	data: RawTransactionArgument<number | bigint[]>;
}
export interface PoseidonBn254Options {
	package: string;
	arguments: PoseidonBn254Arguments | [data: RawTransactionArgument<number | bigint[]>];
}
/**
 * @param data: Vector of BN254 field elements to hash.
 *
 * Hash the inputs using poseidon_bn254 and returns a BN254 field element.
 *
 * Each element has to be a BN254 field element in canonical representation so it
 * must be smaller than the BN254 scalar field size which
 * is 21888242871839275222246405745257275088548364400416034343698204186575808495617.
 *
 * This function supports between 1 and 16 inputs. If you need to hash more than 16
 * inputs, some implementations instead returns the root of a k-ary Merkle tree
 * with the inputs as leafs, but since this is not standardized, we leave that to
 * the caller to implement if needed.
 *
 * If the input is empty, the function will abort with EEmptyInput. If more than 16
 * inputs are provided, the function will abort with ETooManyInputs.
 */
export function poseidonBn254(options: PoseidonBn254Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u256>'] satisfies (string | null)[];
	const parameterNames = ['data'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'poseidon',
			function: 'poseidon_bn254',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
