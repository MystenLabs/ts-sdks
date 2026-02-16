/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/** Group operations of BLS12-381. */

import {
	MoveStruct,
	normalizeMoveArguments,
	type RawTransactionArgument,
} from '../../../utils/index.js';
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
export interface Bls12381MinSigVerifyArguments {
	signature: RawTransactionArgument<number[]>;
	publicKey: RawTransactionArgument<number[]>;
	msg: RawTransactionArgument<number[]>;
}
export interface Bls12381MinSigVerifyOptions {
	package: string;
	arguments:
		| Bls12381MinSigVerifyArguments
		| [
				signature: RawTransactionArgument<number[]>,
				publicKey: RawTransactionArgument<number[]>,
				msg: RawTransactionArgument<number[]>,
		  ];
}
/**
 * @param signature: A 48-bytes signature that is a point on the G1 subgroup.
 * @param public_key: A 96-bytes public key that is a point on the G2 subgroup.
 * @param msg: The message that we test the signature against.
 *
 * If the signature is a valid signature of the message and public key according to
 * BLS*SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL*, return true. Otherwise, return
 * false.
 */
export function bls12381MinSigVerify(options: Bls12381MinSigVerifyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['signature', 'publicKey', 'msg'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'bls12381_min_sig_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface Bls12381MinPkVerifyArguments {
	signature: RawTransactionArgument<number[]>;
	publicKey: RawTransactionArgument<number[]>;
	msg: RawTransactionArgument<number[]>;
}
export interface Bls12381MinPkVerifyOptions {
	package: string;
	arguments:
		| Bls12381MinPkVerifyArguments
		| [
				signature: RawTransactionArgument<number[]>,
				publicKey: RawTransactionArgument<number[]>,
				msg: RawTransactionArgument<number[]>,
		  ];
}
/**
 * @param signature: A 96-bytes signature that is a point on the G2 subgroup.
 * @param public_key: A 48-bytes public key that is a point on the G1 subgroup.
 * @param msg: The message that we test the signature against.
 *
 * If the signature is a valid signature of the message and public key according to
 * BLS*SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL*, return true. Otherwise, return
 * false.
 */
export function bls12381MinPkVerify(options: Bls12381MinPkVerifyOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>', 'vector<u8>', 'vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['signature', 'publicKey', 'msg'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'bls12381_min_pk_verify',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ScalarFromBytesArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface ScalarFromBytesOptions {
	package: string;
	arguments: ScalarFromBytesArguments | [bytes: RawTransactionArgument<number[]>];
}
export function scalarFromBytes(options: ScalarFromBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ScalarFromU64Arguments {
	x: RawTransactionArgument<number | bigint>;
}
export interface ScalarFromU64Options {
	package: string;
	arguments: ScalarFromU64Arguments | [x: RawTransactionArgument<number | bigint>];
}
export function scalarFromU64(options: ScalarFromU64Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['u64'] satisfies (string | null)[];
	const parameterNames = ['x'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_from_u64',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ScalarZeroOptions {
	package: string;
	arguments?: [];
}
export function scalarZero(options: ScalarZeroOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_zero',
		});
}
export interface ScalarOneOptions {
	package: string;
	arguments?: [];
}
export function scalarOne(options: ScalarOneOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_one',
		});
}
export interface ScalarAddArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface ScalarAddOptions {
	package: string;
	arguments:
		| ScalarAddArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function scalarAdd(options: ScalarAddOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ScalarSubArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface ScalarSubOptions {
	package: string;
	arguments:
		| ScalarSubArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function scalarSub(options: ScalarSubOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_sub',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ScalarMulArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface ScalarMulOptions {
	package: string;
	arguments:
		| ScalarMulArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function scalarMul(options: ScalarMulOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ScalarDivArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface ScalarDivOptions {
	package: string;
	arguments:
		| ScalarDivArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
/** Returns e2/e1, fails if a is zero. */
export function scalarDiv(options: ScalarDivOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ScalarNegArguments {
	e: RawTransactionArgument<string>;
}
export interface ScalarNegOptions {
	package: string;
	arguments: ScalarNegArguments | [e: RawTransactionArgument<string>];
}
export function scalarNeg(options: ScalarNegOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_neg',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface ScalarInvArguments {
	e: RawTransactionArgument<string>;
}
export interface ScalarInvOptions {
	package: string;
	arguments: ScalarInvArguments | [e: RawTransactionArgument<string>];
}
export function scalarInv(options: ScalarInvOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'scalar_inv',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G1FromBytesArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface G1FromBytesOptions {
	package: string;
	arguments: G1FromBytesArguments | [bytes: RawTransactionArgument<number[]>];
}
export function g1FromBytes(options: G1FromBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G1IdentityOptions {
	package: string;
	arguments?: [];
}
export function g1Identity(options: G1IdentityOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_identity',
		});
}
export interface G1GeneratorOptions {
	package: string;
	arguments?: [];
}
export function g1Generator(options: G1GeneratorOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_generator',
		});
}
export interface G1AddArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface G1AddOptions {
	package: string;
	arguments:
		| G1AddArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function g1Add(options: G1AddOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G1SubArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface G1SubOptions {
	package: string;
	arguments:
		| G1SubArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function g1Sub(options: G1SubOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_sub',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G1MulArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface G1MulOptions {
	package: string;
	arguments:
		| G1MulArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function g1Mul(options: G1MulOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G1DivArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface G1DivOptions {
	package: string;
	arguments:
		| G1DivArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
/** Returns e2 / e1, fails if scalar is zero. */
export function g1Div(options: G1DivOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G1NegArguments {
	e: RawTransactionArgument<string>;
}
export interface G1NegOptions {
	package: string;
	arguments: G1NegArguments | [e: RawTransactionArgument<string>];
}
export function g1Neg(options: G1NegOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_neg',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HashToG1Arguments {
	m: RawTransactionArgument<number[]>;
}
export interface HashToG1Options {
	package: string;
	arguments: HashToG1Arguments | [m: RawTransactionArgument<number[]>];
}
/** Hash using DST = BLS*SIG_BLS12381G1_XMD:SHA-256_SSWU_RO_NUL* */
export function hashToG1(options: HashToG1Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['m'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'hash_to_g1',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G1MultiScalarMultiplicationArguments {
	scalars: RawTransactionArgument<string[]>;
	elements: RawTransactionArgument<string[]>;
}
export interface G1MultiScalarMultiplicationOptions {
	package: string;
	arguments:
		| G1MultiScalarMultiplicationArguments
		| [scalars: RawTransactionArgument<string[]>, elements: RawTransactionArgument<string[]>];
}
/**
 * Let 'scalars' be the vector [s1, s2, ..., sn] and 'elements' be the vector [e1,
 * e2, ..., en]. Returns s1*e1 + s2*e2 + ... + sn\*en. Aborts with `EInputTooLong`
 * if the vectors are larger than 32 (may increase in the future).
 */
export function g1MultiScalarMultiplication(options: G1MultiScalarMultiplicationOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<null>', 'vector<null>'] satisfies (string | null)[];
	const parameterNames = ['scalars', 'elements'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_multi_scalar_multiplication',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G1ToUncompressedG1Arguments {
	e: RawTransactionArgument<string>;
}
export interface G1ToUncompressedG1Options {
	package: string;
	arguments: G1ToUncompressedG1Arguments | [e: RawTransactionArgument<string>];
}
/** Convert an `Element<G1>` to uncompressed form. */
export function g1ToUncompressedG1(options: G1ToUncompressedG1Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g1_to_uncompressed_g1',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G2FromBytesArguments {
	bytes: RawTransactionArgument<number[]>;
}
export interface G2FromBytesOptions {
	package: string;
	arguments: G2FromBytesArguments | [bytes: RawTransactionArgument<number[]>];
}
export function g2FromBytes(options: G2FromBytesOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['bytes'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_from_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G2IdentityOptions {
	package: string;
	arguments?: [];
}
export function g2Identity(options: G2IdentityOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_identity',
		});
}
export interface G2GeneratorOptions {
	package: string;
	arguments?: [];
}
export function g2Generator(options: G2GeneratorOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_generator',
		});
}
export interface G2AddArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface G2AddOptions {
	package: string;
	arguments:
		| G2AddArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function g2Add(options: G2AddOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G2SubArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface G2SubOptions {
	package: string;
	arguments:
		| G2SubArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function g2Sub(options: G2SubOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_sub',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G2MulArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface G2MulOptions {
	package: string;
	arguments:
		| G2MulArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function g2Mul(options: G2MulOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G2DivArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface G2DivOptions {
	package: string;
	arguments:
		| G2DivArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
/** Returns e2 / e1, fails if scalar is zero. */
export function g2Div(options: G2DivOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G2NegArguments {
	e: RawTransactionArgument<string>;
}
export interface G2NegOptions {
	package: string;
	arguments: G2NegArguments | [e: RawTransactionArgument<string>];
}
export function g2Neg(options: G2NegOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_neg',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface HashToG2Arguments {
	m: RawTransactionArgument<number[]>;
}
export interface HashToG2Options {
	package: string;
	arguments: HashToG2Arguments | [m: RawTransactionArgument<number[]>];
}
/** Hash using DST = BLS*SIG_BLS12381G2_XMD:SHA-256_SSWU_RO_NUL* */
export function hashToG2(options: HashToG2Options) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	const parameterNames = ['m'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'hash_to_g2',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface G2MultiScalarMultiplicationArguments {
	scalars: RawTransactionArgument<string[]>;
	elements: RawTransactionArgument<string[]>;
}
export interface G2MultiScalarMultiplicationOptions {
	package: string;
	arguments:
		| G2MultiScalarMultiplicationArguments
		| [scalars: RawTransactionArgument<string[]>, elements: RawTransactionArgument<string[]>];
}
/**
 * Let 'scalars' be the vector [s1, s2, ..., sn] and 'elements' be the vector [e1,
 * e2, ..., en]. Returns s1*e1 + s2*e2 + ... + sn\*en. Aborts with `EInputTooLong`
 * if the vectors are larger than 32 (may increase in the future).
 */
export function g2MultiScalarMultiplication(options: G2MultiScalarMultiplicationOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<null>', 'vector<null>'] satisfies (string | null)[];
	const parameterNames = ['scalars', 'elements'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'g2_multi_scalar_multiplication',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GtIdentityOptions {
	package: string;
	arguments?: [];
}
export function gtIdentity(options: GtIdentityOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_identity',
		});
}
export interface GtGeneratorOptions {
	package: string;
	arguments?: [];
}
export function gtGenerator(options: GtGeneratorOptions = {}) {
	const packageAddress = options.package;
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_generator',
		});
}
export interface GtAddArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface GtAddOptions {
	package: string;
	arguments:
		| GtAddArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function gtAdd(options: GtAddOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_add',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GtSubArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface GtSubOptions {
	package: string;
	arguments:
		| GtSubArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function gtSub(options: GtSubOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_sub',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GtMulArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface GtMulOptions {
	package: string;
	arguments:
		| GtMulArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function gtMul(options: GtMulOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_mul',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GtDivArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface GtDivOptions {
	package: string;
	arguments:
		| GtDivArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
/** Returns e2 / e1, fails if scalar is zero. */
export function gtDiv(options: GtDivOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_div',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface GtNegArguments {
	e: RawTransactionArgument<string>;
}
export interface GtNegOptions {
	package: string;
	arguments: GtNegArguments | [e: RawTransactionArgument<string>];
}
export function gtNeg(options: GtNegOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'gt_neg',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface PairingArguments {
	e1: RawTransactionArgument<string>;
	e2: RawTransactionArgument<string>;
}
export interface PairingOptions {
	package: string;
	arguments:
		| PairingArguments
		| [e1: RawTransactionArgument<string>, e2: RawTransactionArgument<string>];
}
export function pairing(options: PairingOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['e1', 'e2'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'pairing',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UncompressedG1ToG1Arguments {
	e: RawTransactionArgument<string>;
}
export interface UncompressedG1ToG1Options {
	package: string;
	arguments: UncompressedG1ToG1Arguments | [e: RawTransactionArgument<string>];
}
/**
 * UncompressedG1 group operations /// Create a `Element<G1>` from its uncompressed
 * form.
 */
export function uncompressedG1ToG1(options: UncompressedG1ToG1Options) {
	const packageAddress = options.package;
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['e'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'uncompressed_g1_to_g1',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface UncompressedG1SumArguments {
	terms: RawTransactionArgument<string[]>;
}
export interface UncompressedG1SumOptions {
	package: string;
	arguments: UncompressedG1SumArguments | [terms: RawTransactionArgument<string[]>];
}
/**
 * Compute the sum of a list of uncompressed elements. This is significantly faster
 * and cheaper than summing the elements.
 */
export function uncompressedG1Sum(options: UncompressedG1SumOptions) {
	const packageAddress = options.package;
	const argumentsTypes = ['vector<null>'] satisfies (string | null)[];
	const parameterNames = ['terms'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'bls12381',
			function: 'uncompressed_g1_sum',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
