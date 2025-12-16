/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/
import { MoveStruct, normalizeMoveArguments } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as object from './object.js';
const $moduleName = '0x2::clock';
export const Clock = new MoveStruct({
	name: `${$moduleName}::Clock`,
	fields: {
		id: object.UID,
		timestamp_ms: bcs.u64(),
	},
});
export interface TimestampMsOptions {
	package?: string;
	arguments?: [];
}
export function timestampMs(options: TimestampMsOptions = {}) {
	const packageAddress =
		options.package ?? '0x0000000000000000000000000000000000000000000000000000000000000002';
	const argumentsTypes = [`${packageAddress}::clock::Clock`] satisfies string[];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'clock',
			function: 'timestamp_ms',
			arguments: normalizeMoveArguments(options.arguments ?? [], argumentsTypes),
		});
}
