/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName =
	'0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837::price_identifier';
export const PriceIdentifier = new MoveStruct({
	name: `${$moduleName}::PriceIdentifier`,
	fields: {
		bytes: bcs.vector(bcs.u8()),
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
			module: 'price_identifier',
			function: 'from_byte_vec',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
export interface GetBytesOptions {
	package?: string;
	arguments: [RawTransactionArgument<string>];
}
export function getBytes(options: GetBytesOptions) {
	const packageAddress =
		options.package ?? '0xabf837e98c26087cba0883c0a7a28326b1fa3c5e1e2c5abdb486f9e8f594c837';
	const argumentsTypes = [null] satisfies (string | null)[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'price_identifier',
			function: 'get_bytes',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes),
		});
}
