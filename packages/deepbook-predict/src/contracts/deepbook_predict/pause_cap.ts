/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Defines revocable emergency authority that can engage global trading or
 * per-market mint pauses but cannot unpause. `Registry` owns the allowlist and all
 * state transitions authorized by this capability.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
const $moduleName = '@local-pkg/deepbook_predict::pause_cap';
export const PauseCap = new MoveStruct({
	name: `${$moduleName}::PauseCap`,
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
}
/** Returns the capability identity used by the registry allowlist. */
export function id(options: IdOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pause_cap',
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
/** Destroy a `PauseCap` the holder no longer needs. */
export function destroy(options: DestroyOptions) {
	const packageAddress = options.package ?? '@local-pkg/deepbook_predict';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['cap'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'pause_cap',
			function: 'destroy',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
