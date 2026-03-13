/**************************************************************
 * THIS FILE IS GENERATED AND SHOULD NOT BE MANUALLY MODIFIED *
 **************************************************************/

/**
 * Versioning module.
 *
 * This module is responsible for managing the versioning of the package.
 *
 * It allows for blocking specific versions of the package in case of emergency, or
 * to slowly deprecate an earlier feature.
 */

import { MoveStruct, normalizeMoveArguments, type RawTransactionArgument } from '../utils/index.js';
import { bcs } from '@mysten/sui/bcs';
import { type Transaction } from '@mysten/sui/transactions';
import * as vec_set from './deps/sui/vec_set.js';
const $moduleName = '@mysten/pas::versioning';
export const Versioning = new MoveStruct({
	name: `${$moduleName}::Versioning`,
	fields: {
		blocked_versions: vec_set.VecSet(bcs.u64()),
	},
});
export interface IsValidVersionArguments {
	versioning: RawTransactionArgument<string>;
	version: RawTransactionArgument<number | bigint>;
}
export interface IsValidVersionOptions {
	package?: string;
	arguments:
		| IsValidVersionArguments
		| [
				versioning: RawTransactionArgument<string>,
				version: RawTransactionArgument<number | bigint>,
		  ];
}
/** Verify that a version is not part of the blocked version list. */
export function isValidVersion(options: IsValidVersionOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null, 'u64'] satisfies (string | null)[];
	const parameterNames = ['versioning', 'version'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioning',
			function: 'is_valid_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
export interface AssertIsValidVersionArguments {
	versioning: RawTransactionArgument<string>;
}
export interface AssertIsValidVersionOptions {
	package?: string;
	arguments: AssertIsValidVersionArguments | [versioning: RawTransactionArgument<string>];
}
export function assertIsValidVersion(options: AssertIsValidVersionOptions) {
	const packageAddress = options.package ?? '@mysten/pas';
	const argumentsTypes = [null] satisfies (string | null)[];
	const parameterNames = ['versioning'];
	return (tx: Transaction) =>
		tx.moveCall({
			package: packageAddress,
			module: 'versioning',
			function: 'assert_is_valid_version',
			arguments: normalizeMoveArguments(options.arguments, argumentsTypes, parameterNames),
		});
}
