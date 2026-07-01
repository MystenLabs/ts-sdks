/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Market lifecycle capability. Authorizes market lifecycle operations without
 * granting any oracle write authority. `Registry` owns the allowlist of valid
 * lifecycle caps and the admin mint/revoke entrypoints; this module owns the cap
 * object and the transaction-local proof consumed by cross-module lifecycle
 * actions.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/deepbook_predict::market_lifecycle_cap';
export const MarketLifecycleCap = new MoveStruct({
	name: `${$moduleName}::MarketLifecycleCap`,
	fields: {
		id: bcs.Address,
	},
});
export const MarketLifecycleProof = new MoveStruct({
	name: `${$moduleName}::MarketLifecycleProof`,
	fields: {
		dummy_field: bcs.bool(),
	},
});
export interface IdArguments {
	cap: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [cap: RawTransactionArgument<string>];
}
/** Return the lifecycle cap object ID. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'market_lifecycle_cap',
			function: 'id',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface DestroyArguments {
	cap: RawTransactionArgument<string>;
}
export interface DestroyOptions {
	package?: string;
	arguments: DestroyArguments | [cap: RawTransactionArgument<string>];
}
/** Destroy a `MarketLifecycleCap` the holder no longer needs. */
export function destroy(options: DestroyOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'market_lifecycle_cap',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
