/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as bytes32 from './deps/0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94/bytes32.js';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::governance';
export const WormholeVAAVerificationReceipt = new MoveStruct({
	name: `${$moduleName}::WormholeVAAVerificationReceipt`,
	fields: {
		payload: bcs.vector(bcs.u8()),
		digest: bytes32.Bytes32,
		sequence: bcs.u64(),
	},
});
export interface TakePayloadOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function takePayload(options: TakePayloadOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::governance::WormholeVAAVerificationReceipt`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance',
			function: 'take_payload',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface TakeDigestOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function takeDigest(options: TakeDigestOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::governance::WormholeVAAVerificationReceipt`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance',
			function: 'take_digest',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface TakeSequenceOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function takeSequence(options: TakeSequenceOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::governance::WormholeVAAVerificationReceipt`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance',
			function: 'take_sequence',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DestroyOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function destroy(options: DestroyOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::governance::WormholeVAAVerificationReceipt`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface VerifyVaaOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function verifyVaa(options: VerifyVaaOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::state::State`,
		'0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94::vaa::VAA',
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance',
			function: 'verify_vaa',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface ExecuteGovernanceInstructionOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function executeGovernanceInstruction(options: ExecuteGovernanceInstructionOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		`${packageAddress}::state::State`,
		`${packageAddress}::governance::WormholeVAAVerificationReceipt`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance',
			function: 'execute_governance_instruction',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
