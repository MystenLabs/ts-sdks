/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines revocable authority for market creation and coordinated pool valuation
 * without granting oracle-write or root-admin power. `Registry` owns the allowlist
 * and converts a valid capability into the ability-less proof consumed by
 * cross-module lifecycle flows.
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
/** Returns the capability identity used by the registry allowlist. */
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
