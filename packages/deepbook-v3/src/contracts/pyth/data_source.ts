/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as external_address from './deps/0xf47329f4344f3bf0f8e436e2f7b485466cff300f12a166563995d3888c296a94/external_address.js';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::data_source';
export const DataSource = new MoveStruct({
	name: `${$moduleName}::DataSource`,
	fields: {
		emitter_chain: bcs.u64(),
		emitter_address: external_address.ExternalAddress,
	},
});
export interface ContainsOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<string>];
}
export function contains(options: ContainsOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [
		'0x0000000000000000000000000000000000000000000000000000000000000002::object::UID',
		`${packageAddress}::data_source::DataSource`,
	] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'data_source',
			function: 'contains',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface EmitterChainOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function emitterChain(options: EmitterChainOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::data_source::DataSource`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'data_source',
			function: 'emitter_chain',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface EmitterAddressOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function emitterAddress(options: EmitterAddressOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [`${packageAddress}::data_source::DataSource`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'data_source',
			function: 'emitter_address',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
