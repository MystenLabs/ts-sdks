/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as price_info from './price_info.js';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::batch_price_attestation';
export const Header = new MoveStruct({
	name: `${$moduleName}::Header`,
	fields: {
		magic: bcs.u64(),
		version_major: bcs.u64(),
		version_minor: bcs.u64(),
		header_size: bcs.u64(),
		payload_id: bcs.u8(),
	},
});
export const BatchPriceAttestation = new MoveStruct({
	name: `${$moduleName}::BatchPriceAttestation`,
	fields: {
		header: Header,
		attestation_size: bcs.u64(),
		attestation_count: bcs.u64(),
		price_infos: bcs.vector(price_info.PriceInfo),
	},
});
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
			module: 'batch_price_attestation',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetAttestationCountOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getAttestationCount(options: GetAttestationCountOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'batch_price_attestation',
			function: 'get_attestation_count',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetPriceInfoOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>, RawTransactionArgument<number | bigint>];
}
export function getPriceInfo(options: GetPriceInfoOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'batch_price_attestation',
			function: 'get_price_info',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface DeserializeOptions {
	package?: string;
	arguments: [RawTransactionArgument<number[]>];
}
export function deserialize(options: DeserializeOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = ['vector<u8>', '0x2::clock::Clock'] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'batch_price_attestation',
			function: 'deserialize',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
