/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '0x2::bls12381';
export const Scalar = new MoveStruct({
	name: `${$moduleName}::Scalar`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const G1 = new MoveStruct({
	name: `${$moduleName}::G1`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const G2 = new MoveStruct({
	name: `${$moduleName}::G2`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const GT = new MoveStruct({
	name: `${$moduleName}::GT`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export const UncompressedG1 = new MoveStruct({
	name: `${$moduleName}::UncompressedG1`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface Bls12381MinSigVerifyOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
	];
}
export function bls12381MinSigVerify(options: Bls12381MinSigVerifyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'bls12381_min_sig_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface Bls12381MinPkVerifyOptions {
	package?: string;
	arguments: [
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
		RawTransactionArgument<number[]>,
	];
}
export function bls12381MinPkVerify(options: Bls12381MinPkVerifyOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'bls12381_min_pk_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ScalarFromBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function scalarFromBytes(options: ScalarFromBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ScalarFromU64Options {
	package?: string;
	arguments: [RawTransactionArgument<number | bigint>];
}
export function scalarFromU64(options: ScalarFromU64Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['u64'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_from_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ScalarZeroOptions {
	package?: string;
	arguments?: [];
}
export function scalarZero(options: ScalarZeroOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_zero',
		});
}
export interface ScalarOneOptions {
	package?: string;
	arguments?: [];
}
export function scalarOne(options: ScalarOneOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_one',
		});
}
export interface ScalarAddOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function scalarAdd(options: ScalarAddOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ScalarSubOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function scalarSub(options: ScalarSubOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_sub',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ScalarMulOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function scalarMul(options: ScalarMulOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ScalarDivOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function scalarDiv(options: ScalarDivOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ScalarNegOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function scalarNeg(options: ScalarNegOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_neg',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ScalarInvOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function scalarInv(options: ScalarInvOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_inv',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G1FromBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function g1FromBytes(options: G1FromBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G1IdentityOptions {
	package?: string;
	arguments?: [];
}
export function g1Identity(options: G1IdentityOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_identity',
		});
}
export interface G1GeneratorOptions {
	package?: string;
	arguments?: [];
}
export function g1Generator(options: G1GeneratorOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_generator',
		});
}
export interface G1AddOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function g1Add(options: G1AddOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G1SubOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function g1Sub(options: G1SubOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_sub',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G1MulOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function g1Mul(options: G1MulOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G1DivOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function g1Div(options: G1DivOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G1NegOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function g1Neg(options: G1NegOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_neg',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface HashToG1Options {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function hashToG1(options: HashToG1Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'hash_to_g1',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G1MultiScalarMultiplicationOptions {
	package?: string;
	arguments: [RawTransactionArgument<string[]>, RawTransactionArgument<string[]>];
}
export function g1MultiScalarMultiplication(options: G1MultiScalarMultiplicationOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<null>', 'vector<null>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_multi_scalar_multiplication',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G1ToUncompressedG1Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function g1ToUncompressedG1(options: G1ToUncompressedG1Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_to_uncompressed_g1',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G2FromBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function g2FromBytes(options: G2FromBytesOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G2IdentityOptions {
	package?: string;
	arguments?: [];
}
export function g2Identity(options: G2IdentityOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_identity',
		});
}
export interface G2GeneratorOptions {
	package?: string;
	arguments?: [];
}
export function g2Generator(options: G2GeneratorOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_generator',
		});
}
export interface G2AddOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function g2Add(options: G2AddOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G2SubOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function g2Sub(options: G2SubOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_sub',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G2MulOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function g2Mul(options: G2MulOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G2DivOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function g2Div(options: G2DivOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G2NegOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function g2Neg(options: G2NegOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_neg',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface HashToG2Options {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function hashToG2(options: HashToG2Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'hash_to_g2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface G2MultiScalarMultiplicationOptions {
	package?: string;
	arguments: [RawTransactionArgument<string[]>, RawTransactionArgument<string[]>];
}
export function g2MultiScalarMultiplication(options: G2MultiScalarMultiplicationOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<null>', 'vector<null>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_multi_scalar_multiplication',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GtIdentityOptions {
	package?: string;
	arguments?: [];
}
export function gtIdentity(options: GtIdentityOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_identity',
		});
}
export interface GtGeneratorOptions {
	package?: string;
	arguments?: [];
}
export function gtGenerator(options: GtGeneratorOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_generator',
		});
}
export interface GtAddOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function gtAdd(options: GtAddOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GtSubOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function gtSub(options: GtSubOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_sub',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GtMulOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function gtMul(options: GtMulOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GtDivOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function gtDiv(options: GtDivOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GtNegOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function gtNeg(options: GtNegOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_neg',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface PairingOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function pairing(options: PairingOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null, null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'pairing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UncompressedG1ToG1Options {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function uncompressedG1ToG1(options: UncompressedG1ToG1Options) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'uncompressed_g1_to_g1',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface UncompressedG1SumOptions {
	package?: string;
	arguments: [RawTransactionArgument<string[]>];
}
export function uncompressedG1Sum(options: UncompressedG1SumOptions) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = ['vector<null>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'uncompressed_g1_sum',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
