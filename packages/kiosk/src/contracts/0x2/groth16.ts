/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
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
	package?: string;
	arguments?: [];
}
export function bls12381(options: Bls12381Options = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'bls12381',
		});
}
export interface Bn254Options {
	package?: string;
	arguments?: [];
}
export function bn254(options: Bn254Options = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'bn254',
		});
}
export interface PvkFromBytesOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
	];
}
export function pvkFromBytes(options: PvkFromBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (
		| string
		| null
	)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'pvk_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PvkToBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function pvkToBytes(options: PvkToBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'pvk_to_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PublicProofInputsFromBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function publicProofInputsFromBytes(options: PublicProofInputsFromBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'public_proof_inputs_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ProofPointsFromBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function proofPointsFromBytes(options: ProofPointsFromBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'proof_points_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PrepareVerifyingKeyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number[]>];
}
export function prepareVerifyingKey(options: PrepareVerifyingKeyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, 'vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'prepare_verifying_key',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface VerifyGroth16ProofOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
		RawTransactionArgument<string>,
	];
}
export function verifyGroth16Proof(options: VerifyGroth16ProofOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null, null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'groth16',
			function: 'verify_groth16_proof',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
