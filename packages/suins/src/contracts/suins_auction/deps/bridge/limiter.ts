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
import * as vec_map from '../sui/vec_map.js';
import * as chain_ids from './chain_ids.js';
const $moduleName = 'bridge::limiter';
export const TransferRecord = new MoveStruct({
	name: `${$moduleName}::TransferRecord`,
	fields: {
		hour_head: bcs.u64(),
		hour_tail: bcs.u64(),
		per_hour_amounts: bcs.vector(bcs.u64()),
		total_amount: bcs.u64(),
	},
});
export const TransferLimiter = new MoveStruct({
	name: `${$moduleName}::TransferLimiter`,
	fields: {
		transfer_limits: vec_map.VecMap(chain_ids.BridgeRoute, bcs.u64()),
		transfer_records: vec_map.VecMap(chain_ids.BridgeRoute, TransferRecord),
	},
});
export const UpdateRouteLimitEvent = new MoveStruct({
	name: `${$moduleName}::UpdateRouteLimitEvent`,
	fields: {
		sending_chain: bcs.u8(),
		receiving_chain: bcs.u8(),
		new_limit: bcs.u64(),
	},
});
export interface GetRouteLimitArguments {
	self: RawTransactionArgument<string>;
	route: RawTransactionArgument<string>;
}
export interface GetRouteLimitOptions {
	package: string;
	arguments:
		| GetRouteLimitArguments
		| [self: RawTransactionArgument<string>, route: RawTransactionArgument<string>];
}
export function getRouteLimit(options: GetRouteLimitOptions) {
	const packageAddress = options.package;
	const argumentsTypes = [null, null] satisfies (string | null)[];
	const parameterNames = ['self', 'route'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'limiter',
			function: 'get_route_limit',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
