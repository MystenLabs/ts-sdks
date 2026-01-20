/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as governance_action from './governance_action.js';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::governance_instruction';
export const GovernanceInstruction = new MoveStruct({
	name: `${$moduleName}::GovernanceInstruction`,
	fields: {
		module_: bcs.u8(),
		action: governance_action.GovernanceAction,
		target_chain_id: bcs.u64(),
		payload: bcs.vector(bcs.u8()),
	},
});
export interface FromByteVecOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function fromByteVec(options: FromByteVecOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = ['vector<u8>'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_instruction',
			function: 'from_byte_vec',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetModuleOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getModule(options: GetModuleOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_instruction',
			function: 'get_module',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetActionOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getAction(options: GetActionOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_instruction',
			function: 'get_action',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetTargetChainIdOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getTargetChainId(options: GetTargetChainIdOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_instruction',
			function: 'get_target_chain_id',
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
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'governance_instruction',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
