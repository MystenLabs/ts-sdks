/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::groth16';
export const Curve = new MoveStruct({
	name: `${$moduleName}::Curve`,
	fields: {
		id: bcs.u8(),
	},
});
export const PreparedVerifyingKey = new MoveStruct({
	name: `${$moduleName}::PreparedVerifyingKey`,
	fields: {
		vk_gamma_abc_g1_bytes: bcs.vector(bcs.u8()),
		alpha_g1_beta_g2_bytes: bcs.vector(bcs.u8()),
		gamma_g2_neg_pc_bytes: bcs.vector(bcs.u8()),
		delta_g2_neg_pc_bytes: bcs.vector(bcs.u8()),
	},
});
export const PublicProofInputs = new MoveStruct({
	name: `${$moduleName}::PublicProofInputs`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
	},
});
export const ProofPoints = new MoveStruct({
	name: `${$moduleName}::ProofPoints`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
	},
});
export interface Bls12381Options {
	package: string;
	arguments?: [];
}
/**
 * Return the `Curve` value indicating that the BLS12-381 construction should be
 * used in a given function.
 */
export function bls12381(options: Bls12381Options = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'bls12381',
		});
}
export interface Bn254Options {
	package: string;
	arguments?: [];
}
/**
 * Return the `Curve` value indicating that the BN254 construction should be used
 * in a given function.
 */
export function bn254(options: Bn254Options = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'bn254',
		});
}
export interface PvkFromBytesArguments {
	vkGammaAbcG1Bytes: RawTransactionArgument<number[]>;
	alphaG1BetaG2Bytes: RawTransactionArgument<number[]>;
	gammaG2NegPcBytes: RawTransactionArgument<number[]>;
	deltaG2NegPcBytes: RawTransactionArgument<number[]>;
}
export interface PvkFromBytesOptions {
	package: string;
	arguments:
		| PvkFromBytesArguments
		| [
				vkGammaAbcG1Bytes: RawTransactionArgument<number[]>,
				alphaG1BetaG2Bytes: RawTransactionArgument<number[]>,
				gammaG2NegPcBytes: RawTransactionArgument<number[]>,
				deltaG2NegPcBytes: RawTransactionArgument<number[]>,
		  ];
}
/** Creates a `PreparedVerifyingKey` from bytes. */
export function pvkFromBytes(options: PvkFromBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	const parameterNames = [
		'vkGammaAbcG1Bytes',
		'alphaG1BetaG2Bytes',
		'gammaG2NegPcBytes',
		'deltaG2NegPcBytes',
	];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'pvk_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PvkToBytesArguments {
	pvk: RawTransactionArgument<string>;
}
export interface PvkToBytesOptions {
	package: string;
	arguments: PvkToBytesArguments | [pvk: RawTransactionArgument<string>];
}
/** Returns bytes of the four components of the `PreparedVerifyingKey`. */
export function pvkToBytes(options: PvkToBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['pvk'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'pvk_to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PublicProofInputsFromBytesArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface PublicProofInputsFromBytesOptions {
	package: string;
	arguments: PublicProofInputsFromBytesArguments | [bytes: RawTransactionArgument<number[]>];
}
/**
 * Creates a `PublicProofInputs` wrapper from bytes. The `bytes` parameter should
 * be a concatenation of a number of 32 bytes scalar field elements to be used as
 * public inputs in little-endian format to a circuit.
 */
export function publicProofInputsFromBytes(options: PublicProofInputsFromBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'public_proof_inputs_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ProofPointsFromBytesArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface ProofPointsFromBytesOptions {
	package: string;
	arguments: ProofPointsFromBytesArguments | [bytes: RawTransactionArgument<number[]>];
}
/** Creates a Groth16 `ProofPoints` from bytes. */
export function proofPointsFromBytes(options: ProofPointsFromBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'proof_points_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PrepareVerifyingKeyArguments {
	curve: RawTransactionArgument<string>;
	verifyingKey: RawTransactionArgument<number[]>;
}
export interface PrepareVerifyingKeyOptions {
	package: string;
	arguments:
		| PrepareVerifyingKeyArguments
		| [curve: RawTransactionArgument<string>, verifyingKey: RawTransactionArgument<number[]>];
}
/**
 * @param curve: What elliptic curve construction to use. See `bls12381` and
 * `bn254`. @param verifying_key: An Arkworks canonical compressed serialization of
 * a verifying key.
 *
 * Returns four vectors of bytes representing the four components of a prepared
 * verifying key. This step computes one pairing e(P, Q), and binds the
 * verification to one particular proof statement. This can be used as inputs for
 * the `verify_groth16_proof` function.
 */
export function prepareVerifyingKey(options: PrepareVerifyingKeyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['curve', 'verifyingKey'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'prepare_verifying_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface VerifyGroth16ProofArguments {
	curve: RawTransactionArgument<string>;
	preparedVerifyingKey: RawTransactionArgument<string>;
	publicProofInputs: RawTransactionArgument<string>;
	proofPoints: RawTransactionArgument<string>;
}
export interface VerifyGroth16ProofOptions {
	package: string;
	arguments:
		| VerifyGroth16ProofArguments
		| [
				curve: RawTransactionArgument<string>,
				preparedVerifyingKey: RawTransactionArgument<string>,
				publicProofInputs: RawTransactionArgument<string>,
				proofPoints: RawTransactionArgument<string>,
		  ];
}
/**
 * @param curve: What elliptic curve construction to use. See the `bls12381` and
 * `bn254` functions. @param prepared_verifying_key: Consists of four vectors of
 * bytes representing the four components of a prepared verifying key. @param
 * public_proof_inputs: Represent inputs that are public. @param proof_points:
 * Represent three proof points.
 *
 * Returns a boolean indicating whether the proof is valid.
 */
export function verifyGroth16Proof(options: VerifyGroth16ProofOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null, null, null] satisfies (string | null)[];
	const parameterNames = ['curve', 'preparedVerifyingKey', 'publicProofInputs', 'proofPoints'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'verify_groth16_proof',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
