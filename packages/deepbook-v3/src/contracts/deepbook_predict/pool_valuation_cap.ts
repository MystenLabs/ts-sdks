/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines revocable authority to start the full-pool valuation (the flush) without
 * granting market-creation, oracle-write, or root-admin power. `Registry` owns the
 * allowlist and issues the transaction-local proof `plp::start_pool_valuation`
 * consumes.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/deepbook_predict::pool_valuation_cap';
export const PoolValuationCap = new MoveStruct({
	name: `${$moduleName}::PoolValuationCap`,
	fields: {
		id: bcs.Address,
	},
});
export interface IdArguments {
	cap: RawTransactionArgument<string>;
}
export interface IdOptions {
	package?: string;
	arguments: IdArguments | [cap: RawTransactionArgument<string>];
	config?: {
		predictPackageId?: string;
	};
}
/** Returns the capability identity used by the registry allowlist. */
export function id(options: IdOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_valuation_cap',
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
	config?: {
		predictPackageId?: string;
	};
}
/** Destroy a `PoolValuationCap` the holder no longer needs. */
export function destroy(options: DestroyOptions) {
	const packageAddress =
		options.package ?? options.config?.predictPackageId ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pool_valuation_cap',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
